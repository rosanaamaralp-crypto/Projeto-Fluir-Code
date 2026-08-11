import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return (
    <main className="foundation-page">
      <div className="foundation-inner">
        <header className="foundation-header reveal" data-testid="header-foundation">
          <div className="wordmark" data-testid="brand-fluir">
            <span className="wordmark-mark" aria-hidden="true" />
            <div>
              <div className="wordmark-name">Projeto Fluir</div>
              <div className="wordmark-subtitle">base de produto</div>
            </div>
          </div>
          <div className="header-note" data-testid="status-foundation">
            <span className="status-dot" aria-hidden="true" />
            fundação inicial ativa
          </div>
        </header>

        <section className="foundation-hero">
          <div className="reveal reveal-delay-1">
            <div className="eyebrow">sistema em inicialização · 01</div>
            <h1 className="hero-title">Um lugar para<br />o cuidado <em>fluir.</em></h1>
            <p className="hero-copy">
              A fundação técnica do <strong>Projeto Fluir</strong> está pronta.
              Estamos construindo, com calma e precisão, a base que vai sustentar
              os próximos capítulos do produto.
            </p>
            <div className="hero-caption">começamos pelo essencial</div>
          </div>
          <div className="architecture-card reveal reveal-delay-2" data-testid="card-architecture">
            <div className="architecture-head">
              <div className="architecture-label">mapa de fundação<br />do projeto</div>
              <div className="architecture-index">FLR / 001</div>
            </div>
            <div className="architecture-diagram" aria-label="Diagrama abstrato da fundação do projeto">
              <div className="diagram-axis" />
              <div className="diagram-axis-vertical" />
              <div className="diagram-ring" />
              <div className="diagram-ring-two" />
              <div className="diagram-core"><span>fluir<br />base</span></div>
            </div>
            <div className="architecture-foot">
              <span>status do núcleo</span>
              <strong>estável</strong>
            </div>
          </div>
        </section>

        <section className="foundation-strip reveal reveal-delay-2" aria-label="Status da fundação">
          <div className="strip-item">
            <div className="strip-kicker">momento</div>
            <div className="strip-value">Preparação consciente</div>
          </div>
          <div className="strip-item">
            <div className="strip-kicker">fundação</div>
            <div className="strip-value"><span className="ok">Operacional</span></div>
          </div>
          <div className="strip-item">
            <div className="strip-kicker">módulos</div>
            <div className="strip-value">Ainda não disponíveis</div>
          </div>
        </section>

        <section className="modules-section">
          <div className="section-heading reveal reveal-delay-2">
            <h2 className="section-title">O que vem depois</h2>
            <p className="section-intro">Os módulos do produto serão apresentados aqui quando estiverem prontos para receber você.</p>
          </div>
          <div className="module-list reveal reveal-delay-3" data-testid="list-modules">
            {[
              ['01', 'Experiências de cuidado', 'Uma base simples para acompanhar cada jornada.', 'em breve'],
              ['02', 'Conexões que importam', 'Espaços pensados para aproximar pessoas e presença.', 'em breve'],
              ['03', 'Ritmos do dia a dia', 'Ferramentas que respeitam o tempo de cada história.', 'em breve'],
            ].map(([number, name, description, state]) => (
              <div className="module-row" key={number} data-testid={`row-module-${number}`}>
                <div className="module-number">{number}</div>
                <div className="module-name">{name}</div>
                <div className="module-description">{description}</div>
                <div className="module-state">{state}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ready-section">
          <div className="reveal reveal-delay-2">
            <h2 className="ready-title">A primeira parte já está <span>viva.</span></h2>
            <p className="ready-copy">A estrutura está preparada para crescer de forma intencional. Por enquanto, este é um ponto de partida — e não uma tela de produto.</p>
          </div>
          <div className="ready-grid reveal reveal-delay-3">
            <article className="ready-card">
              <div className="ready-icon">01</div>
              <h3>Fundação</h3>
              <p>Estrutura inicial configurada e pronta para evoluir.</p>
            </article>
            <article className="ready-card">
              <div className="ready-icon">02</div>
              <h3>Intenção</h3>
              <p>Decisões guiadas por clareza, cuidado e utilidade.</p>
            </article>
            <article className="ready-card">
              <div className="ready-icon">03</div>
              <h3>Próximo passo</h3>
              <p>Os módulos chegam quando puderem entregar valor real.</p>
            </article>
          </div>
        </section>

        <footer className="foundation-footer">
          <span className="footer-mark">Projeto Fluir</span>
          <span>fundação inicial · sem módulos ativos</span>
          <span>versão 0.1</span>
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
