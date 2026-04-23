"""
Scraper para sites dinâmicos usando Playwright com stealth básico.
Substitui requisições simples quando o site usa JavaScript ou anti-bot leve.
"""

import hashlib
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from urllib.parse import urljoin, urlparse

import sys
from pathlib import Path

parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from models.scraper import ScrapedContent, SourceType
from utils.config import Config
from utils.logger import setup_logger

logger = setup_logger()

# Tenta importar playwright; se não estiver disponível, desabilita este scraper
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("⚠️  Playwright não instalado. PlaywrightScraper será desabilitado.")


class PlaywrightScraper:
    """Scraper baseado em Playwright para sites dinâmicos e anti-bot leve"""

    def __init__(self):
        self.config = Config()
        self._playwright = None
        self._browser = None

    def _get_browser(self):
        """Inicializa o browser com stealth básico"""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright não está instalado")

        if self._browser is None:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ]
            )
        return self._browser

    def _new_context(self):
        """Cria um contexto com fingerprint realista"""
        browser = self._get_browser()
        return browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            java_script_enabled=True,
            bypass_csp=True,
        )

    def _stealth_inject(self, page):
        """Injeta scripts para esconder sinais de automação"""
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en']
            });
        """)

    def scrape_url(self, url: str, wait_for: str = None, timeout: int = 30000) -> Optional[ScrapedContent]:
        """
        Faz scraping de uma URL específica usando Playwright.

        Args:
            url: URL para scraping
            wait_for: Seletor CSS para aguardar antes de extrair (ex: 'article')
            timeout: Timeout em ms

        Returns:
            ScrapedContent ou None
        """
        if not PLAYWRIGHT_AVAILABLE:
            logger.error("❌ Playwright não disponível")
            return None

        logger.info(f"🎭 Playwright scraping: {url}")

        context = None
        page = None
        try:
            context = self._new_context()
            page = context.new_page()
            self._stealth_inject(page)

            page.goto(url, wait_until="networkidle", timeout=timeout)

            if wait_for:
                try:
                    page.wait_for_selector(wait_for, timeout=5000)
                except PWTimeout:
                    logger.debug(f"⏱️  Seletor {wait_for} não encontrado, prosseguindo")

            # Extrair HTML limpo
            html = page.content()

            # Extrair dados
            return self._parse_from_html(html, url)

        except Exception as e:
            logger.error(f"❌ Erro no Playwright scraping de {url}: {e}")
            return None
        finally:
            if page:
                page.close()
            if context:
                context.close()

    def scrape_batch(self, urls: List[str], wait_for: str = None, timeout: int = 30000) -> List[ScrapedContent]:
        """
        Faz scraping em lote de múltiplas URLs.

        Args:
            urls: Lista de URLs
            wait_for: Seletor CSS para aguardar
            timeout: Timeout em ms

        Returns:
            Lista de ScrapedContent
        """
        results = []
        for url in urls:
            content = self.scrape_url(url, wait_for, timeout)
            if content:
                results.append(content)
        return results

    def _parse_from_html(self, html: str, url: str) -> Optional[ScrapedContent]:
        """Parseia HTML e retorna ScrapedContent com markdown"""
        from bs4 import BeautifulSoup
        from markdownify import markdownify as md

        soup = BeautifulSoup(html, 'html.parser')

        # Remover scripts, styles, nav, footer, ads
        for selector in ['script', 'style', 'nav', 'header', 'footer', 'aside',
                          '.advertisement', '.ads', '.social-share', '.comments',
                          '#cookie-banner', '.newsletter-signup']:
            for el in soup.select(selector):
                el.decompose()

        # Extrair título
        title = self._extract_title(soup, url)

        # Extrair conteúdo principal
        content_html = self._extract_content_html(soup)

        # Converter para markdown
        content_markdown = md(str(content_html), heading_style="ATX", strip=['a']) if content_html else ""
        content_markdown = self._clean_markdown(content_markdown)

        # Fallback: se markdown vazio, usar texto puro
        if not content_markdown or len(content_markdown) < 100:
            body = soup.find('body')
            content_markdown = body.get_text(separator='\n', strip=True) if body else ""

        # Extrair metadados
        author = self._extract_author(soup)
        published_at = self._extract_date(soup)
        tags = self._extract_tags(soup)
        summary = self._extract_summary(soup)

        word_count = len(content_markdown.split()) if content_markdown else 0
        reading_time = max(1, word_count // 200) if word_count else 0

        return ScrapedContent(
            title=title,
            url=url,
            content_text=content_markdown,
            summary=summary,
            author=author,
            published_at=published_at,
            tags=tags,
            source_type=SourceType.BLOG,
            word_count=word_count,
            reading_time=reading_time
        )

    def _extract_title(self, soup, url: str) -> str:
        """Extrai título da página"""
        for selector in ['h1', '.entry-title', '.post-title', 'article h1', '[data-testid="storyTitle"]']:
            el = soup.select_one(selector)
            if el and el.get_text(strip=True):
                return el.get_text(strip=True)
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text(strip=True)
        return urlparse(url).path or "Sem título"

    def _extract_content_html(self, soup) -> Optional[Any]:
        """Extrai o elemento HTML principal do conteúdo"""
        for selector in [
            'article', '.entry-content', '.post-content', '.content',
            'main', '.main-content', '[role="main"]',
            '.article-body', '.story-body'
        ]:
            el = soup.select_one(selector)
            if el and len(el.get_text(strip=True)) > 200:
                return el
        # Fallback: body
        body = soup.find('body')
        return body

    def _clean_markdown(self, md: str) -> str:
        """Limpa markdown de artefatos indesejados"""
        if not md:
            return ""
        # Remover múltiplas linhas em branco
        md = re.sub(r'\n{3,}', '\n\n', md)
        # Remover espaços no início das linhas
        md = re.sub(r'^[ \t]+', '', md, flags=re.MULTILINE)
        return md.strip()

    def _extract_author(self, soup) -> Optional[str]:
        """Extrai autor"""
        for selector in ['.author', '.by-author', '.post-author', 'a[rel="author"]']:
            el = soup.select_one(selector)
            if el:
                return el.get_text(strip=True)
        meta = soup.find('meta', attrs={'name': 'author'})
        if meta:
            return meta.get('content')
        return None

    def _extract_date(self, soup) -> Optional[datetime]:
        """Extrai data de publicação"""
        from dateutil.parser import parse
        for selector in ['time[datetime]', 'meta[property="article:published_time"]']:
            el = soup.select_one(selector)
            if el:
                dt = el.get('datetime') or el.get('content')
                if dt:
                    try:
                        return parse(dt)
                    except Exception:
                        continue
        return None

    def _extract_tags(self, soup) -> List[str]:
        """Extrai tags/categorias"""
        tags = []
        meta = soup.find('meta', attrs={'name': 'keywords'})
        if meta and meta.get('content'):
            tags = [t.strip() for t in meta['content'].split(',')]
        for el in soup.select('.tag, .category, .post-tag')[:10]:
            text = el.get_text(strip=True)
            if text and text not in tags:
                tags.append(text)
        return tags[:10]

    def _extract_summary(self, soup) -> Optional[str]:
        """Extrai resumo/meta description"""
        meta = soup.find('meta', attrs={'name': 'description'})
        if meta and meta.get('content'):
            return meta['content']
        og = soup.find('meta', attrs={'property': 'og:description'})
        if og and og.get('content'):
            return og['content']
        first_p = soup.find('p')
        if first_p:
            text = first_p.get_text(strip=True)
            if text and len(text) < 500:
                return text
        return None

    def close(self):
        """Fecha o browser e libera recursos"""
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._playwright:
            self._playwright.stop()
            self._playwright = None

    def __del__(self):
        self.close()
