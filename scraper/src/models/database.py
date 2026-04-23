"""
Interface de banco de dados para o scraper
"""

import sqlite3
import json
import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from contextlib import contextmanager

from .scraper import Source, Client, ScrapedContent, Brief, AnalysisConfig
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger()

class Database:
    """Classe de interface com o banco de dados SQLite"""
    
    def __init__(self):
        """Inicializar conexão com o banco"""
        self.config = Config()
        self.db_path = self.config.get_database_path()
        
        # Garantir que o diretório do banco existe
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"📁 Banco de dados: {self.db_path}")
        
        # Inicializar tabelas se não existirem
        self._init_tables()
    
    @contextmanager
    def get_connection(self):
        """Context manager para conexão com o banco"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Retornar resultados como dicionários
        try:
            yield conn
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro no banco de dados: {e}")
            raise
        finally:
            conn.close()
    
    def _init_tables(self):
        """Inicializar tabelas do banco se não existirem"""
        with self.get_connection() as conn:
            # Tabela de clientes
            conn.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    niche TEXT,
                    target_audience TEXT,
                    created_at INTEGER
                )
            """)
            
            # Tabela de fontes
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL,
                    type TEXT DEFAULT 'blog',
                    is_active INTEGER DEFAULT 1,
                    last_scraped_at INTEGER,
                    created_at INTEGER,
                    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                )
            """)
            
            # Tabela de conteúdos
            conn.execute("""
                CREATE TABLE IF NOT EXISTS contents (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    client_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    content_text TEXT,
                    content_hash TEXT,
                    summary TEXT,
                    topics TEXT, -- JSON
                    published_at INTEGER,
                    scraped_at INTEGER,
                    is_analyzed INTEGER DEFAULT 0,
                    FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE,
                    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                )
            """)
            
            # Tabela de pautas
            conn.execute("""
                CREATE TABLE IF NOT EXISTS briefs (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    content_ids TEXT, -- JSON
                    title TEXT NOT NULL,
                    angle TEXT,
                    key_points TEXT, -- JSON
                    content_type TEXT,
                    suggested_copy TEXT,
                    status TEXT DEFAULT 'draft',
                    created_at INTEGER,
                    generated_by TEXT DEFAULT 'claude',
                    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                )
            """)
            
            # Tabela de configurações de análise
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analysis_configs (
                    id TEXT PRIMARY KEY,
                    client_id TEXT NOT NULL,
                    min_content_length INTEGER DEFAULT 500,
                    topics_of_interest TEXT, -- JSON
                    exclude_patterns TEXT, -- JSON
                    created_at INTEGER,
                    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                )
            """)
            
            # Migração: adicionar content_hash se não existir (tabelas antigas)
            try:
                conn.execute("ALTER TABLE contents ADD COLUMN content_hash TEXT")
                logger.info("✅ Coluna content_hash adicionada")
            except sqlite3.OperationalError:
                pass  # Coluna já existe
            
            # Migração: adicionar índice de hash
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_contents_hash 
                ON contents (client_id, content_hash)
            """)
            
            conn.commit()
            logger.info("✅ Tabelas inicializadas com sucesso")
    
    def get_clients(self) -> List[Client]:
        """Obter todos os clientes"""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM clients")
            rows = cursor.fetchall()
            
            clients = []
            for row in rows:
                clients.append(Client(
                    id=row['id'],
                    name=row['name'],
                    description=row['description'],
                    niche=row['niche'],
                    target_audience=row['target_audience'],
                    created_at=datetime.fromtimestamp(row['created_at'] / 1000) if row['created_at'] else None
                ))
            
            return clients
    
    def get_sources_by_client(self, client_id: str) -> List[Source]:
        """Obter fontes de um cliente"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM sources WHERE client_id = ? AND is_active = 1",
                (client_id,)
            )
            rows = cursor.fetchall()
            
            sources = []
            for row in rows:
                sources.append(Source(
                    id=row['id'],
                    client_id=row['client_id'],
                    name=row['name'],
                    url=row['url'],
                    type=row['type'],
                    is_active=bool(row['is_active']),
                    last_scraped_at=datetime.fromtimestamp(row['last_scraped_at'] / 1000) if row['last_scraped_at'] else None,
                    created_at=datetime.fromtimestamp(row['created_at'] / 1000) if row['created_at'] else None
                ))
            
            return sources
    
    def get_all_active_sources(self) -> List[Source]:
        """Obter todas as fontes ativas"""
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM sources WHERE is_active = 1")
            rows = cursor.fetchall()
            
            sources = []
            for row in rows:
                sources.append(Source(
                    id=row['id'],
                    client_id=row['client_id'],
                    name=row['name'],
                    url=row['url'],
                    type=row['type'],
                    is_active=bool(row['is_active']),
                    last_scraped_at=datetime.fromtimestamp(row['last_scraped_at'] / 1000) if row['last_scraped_at'] else None,
                    created_at=datetime.fromtimestamp(row['created_at'] / 1000) if row['created_at'] else None
                ))
            
            return sources
    
    def _compute_content_hash(self, text: str) -> str:
        """Computa hash SHA-256 do conteúdo para deduplicação"""
        if not text:
            return ""
        # Normaliza: remove espaços extras e converte para lowercase
        normalized = " ".join(text.lower().split())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:32]

    def save_content(self, content: ScrapedContent, source_id: str, client_id: str) -> Optional[str]:
        """Salvar conteúdo no banco de dados com deduplicação por hash"""
        content_id = f"content_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(content.url) % 10000}"
        content_hash = self._compute_content_hash(content.content_text)
        
        with self.get_connection() as conn:
            # Verificar deduplicação por hash por cliente
            cursor = conn.execute(
                "SELECT id FROM contents WHERE client_id = ? AND content_hash = ?",
                (client_id, content_hash)
            )
            if cursor.fetchone():
                logger.info(f"📄 Conteúdo duplicado (hash) para cliente {client_id}: {content.url}")
                return None
            
            # Verificar se URL já existe
            cursor = conn.execute("SELECT id FROM contents WHERE url = ?", (content.url,))
            if cursor.fetchone():
                logger.info(f"📄 Conteúdo já existe (URL): {content.url}")
                return None
            
            # Inserir novo conteúdo
            conn.execute("""
                INSERT INTO contents (
                    id, source_id, client_id, title, url, content_text, content_hash,
                    summary, topics, published_at, scraped_at, is_analyzed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                content_id,
                source_id,
                client_id,
                content.title,
                content.url,
                content.content_text,
                content_hash,
                content.summary,
                json.dumps(content.tags) if content.tags else None,
                int(content.published_at.timestamp() * 1000) if content.published_at else None,
                int(datetime.now().timestamp() * 1000),
                0
            ))
            
            conn.commit()
            logger.info(f"💾 Conteúdo salvo: {content.title}")
            return content_id
    
    def update_source_last_scraped(self, source_id: str):
        """Atualizar data do último scraping da fonte"""
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE sources SET last_scraped_at = ? WHERE id = ?",
                (int(datetime.now().timestamp() * 1000), source_id)
            )
            conn.commit()
    
    def get_contents_by_client(self, client_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Obter conteúdos de um cliente"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM contents WHERE client_id = ? ORDER BY scraped_at DESC LIMIT ?",
                (client_id, limit)
            )
            rows = cursor.fetchall()
            
            contents = []
            for row in rows:
                contents.append(dict(row))
            
            return contents
    
    def save_brief(self, brief: Brief) -> str:
        """Salvar pauta no banco de dados"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO briefs (
                    id, client_id, content_ids, title, angle, key_points,
                    content_type, suggested_copy, status, created_at, generated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                brief.id,
                brief.client_id,
                json.dumps(brief.content_ids) if brief.content_ids else None,
                brief.title,
                brief.angle,
                json.dumps(brief.key_points) if brief.key_points else None,
                brief.content_type,
                brief.suggested_copy,
                brief.status,
                int(brief.created_at.timestamp() * 1000),
                brief.generated_by
            ))
            
            conn.commit()
            logger.info(f"💾 Pauta salva: {brief.title}")
            return brief.id