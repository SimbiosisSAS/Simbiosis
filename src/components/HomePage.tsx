import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, TrendingUp, Building2, Target, Zap, Shield, BarChart3,
  Users, Globe, MessageCircle, ChevronRight, CheckCircle, Sparkles,
  Rocket, Lock, FileCheck, Server, Eye, Award, BookOpen, Phone,
  Mail, MapPin, ChevronDown, Play, ArrowUpRight, Cpu, Landmark, Calculator
} from 'lucide-react';
import CreditDemoModal from './CreditDemoModal';

interface HomePageProps {
  onStartApplication: () => void;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HomePage({ onStartApplication }: HomePageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/573197987310', '_blank');
  };

  const navLinks = [
    { href: '#soluciones', label: 'Soluciones' },
    { href: '#seguridad', label: 'Seguridad' },
    { href: '#nosotros', label: 'Nosotros' },
    { href: '#recursos', label: 'Recursos' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-200/60'
          : 'bg-transparent'
      }`}>
        <div className="container-main flex items-center justify-between h-18 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-navy-700 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-navy-900/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-navy-900 tracking-tight">Simbiosis</span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="btn-ghost"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button className="btn-ghost font-semibold text-navy-700">
              Iniciar Sesion
            </button>
            <button
              onClick={onStartApplication}
              className="btn-primary !px-6 !py-2.5"
            >
              Crear Cuenta
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-5 h-5 flex flex-col justify-center gap-1.5">
              <span className={`block h-0.5 bg-navy-900 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-navy-900 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-navy-900 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg">
            <div className="container-main py-4 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-lg text-navy-700 font-semibold hover:bg-slate-50">
                  Iniciar Sesion
                </button>
                <button
                  onClick={onStartApplication}
                  className="w-full btn-primary text-center"
                >
                  Crear Cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* WhatsApp Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-8 right-8 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 transition-all z-40 flex items-center justify-center hover:scale-105 active:scale-95"
        title="Contáctanos por WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <main>
        {/* Hero Section */}
        <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-navy-400/10 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/3 rounded-full blur-[150px]" />
          </div>

          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />

          <div className="container-main relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="animate-fade-in">
                <div className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-8">
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Plataforma Fintech de Nueva Generacion</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight text-balance">
                  Financiamiento
                  <span className="block gradient-text">Inteligente</span>
                  para Empresas
                </h1>

                <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-lg">
                  Creditos corporativos impulsados por IA con aprobacion rapida, terminos flexibles y soluciones disenadas para empresas en crecimiento en Latinoamerica.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <button
                    onClick={onStartApplication}
                    className="btn-primary !px-8 !py-4 !text-base inline-flex items-center justify-center gap-2"
                  >
                    Solicitar Credito
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDemoModalOpen(true)}
                    className="border-2 border-slate-500/40 text-white hover:bg-white/5 hover:border-slate-400/60 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2"
                  >
                    <Calculator className="w-5 h-5" />
                    Simular Credito
                  </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Sin costos ocultos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Aprobacion 24h</span>
                  </div>
                </div>
              </div>

              <div className="lg:flex justify-end hidden animate-slide-in-right">
                <div className="w-full max-w-md relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-navy-500/20 rounded-3xl blur-2xl" />

                  <div className="relative glass-card-dark p-8 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dashboard</span>
                      <span className="text-xs text-emerald-400 font-medium">En vivo</span>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-navy-900/60 rounded-xl p-4 border border-navy-700/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-400">Capital desplegado</span>
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-bold text-white">$7.2M</p>
                        <div className="mt-2 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-navy-900/60 rounded-xl p-4 border border-navy-700/30">
                          <span className="text-xs text-slate-400">Tasa aprobacion</span>
                          <p className="text-xl font-bold text-emerald-400 mt-1">85%</p>
                        </div>
                        <div className="bg-navy-900/60 rounded-xl p-4 border border-navy-700/30">
                          <span className="text-xs text-slate-400">Clientes activos</span>
                          <p className="text-xl font-bold text-white mt-1">127</p>
                        </div>
                      </div>

                      <div className="bg-navy-900/60 rounded-xl p-4 border border-navy-700/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Solicitudes hoy</span>
                          <span className="text-xs text-emerald-400 font-medium">+12%</span>
                        </div>
                        <div className="flex items-end gap-1 mt-3 h-10">
                          {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-emerald-500/60 to-emerald-400/80 rounded-sm"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
        </section>

        {/* Partners / Trust Bar */}
        <section className="py-12 border-b border-slate-200/60 bg-white">
          <div className="container-main">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-8">
              Respaldo institucional y regulatorio
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {[
                { name: 'Banco de la Republica', icon: Landmark },
                { name: 'Superfinanciera', icon: Shield },
                { name: 'Fondo Nacional', icon: Building2 },
                { name: 'Fintech Colombia', icon: Cpu },
                { name: 'SEC Compliant', icon: FileCheck },
              ].map((partner, idx) => {
                const Icon = partner.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 text-slate-400 hover:text-navy-700 transition-colors group">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{partner.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust Metrics */}
        <section className="section-padding bg-white">
          <div className="container-main">
            <AnimatedSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                {[
                  { value: '$7M+', label: 'Capital levantado en LATAM y Canada', icon: BarChart3 },
                  { value: '12+', label: 'Negocios latinoamericanos fortalecidos', icon: Building2 },
                  { value: '3', label: 'Paises servidos', icon: Globe },
                  { value: '98%', label: 'Satisfaccion de clientes', icon: Users },
                ].map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <div key={idx} className="text-center group">
                      <div className="inline-flex w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                        <Icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-3xl md:text-4xl font-bold gradient-text-navy mb-2">{metric.value}</p>
                      <p className="text-sm text-slate-500 font-medium leading-snug">{metric.label}</p>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Solutions Section */}
        <section id="soluciones" className="section-padding bg-slate-50">
          <div className="container-main">
            <AnimatedSection>
              <div className="mb-16 max-w-2xl">
                <div className="badge bg-emerald-50 border border-emerald-200 text-emerald-700 mb-6">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Soluciones</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-6 tracking-tight text-balance">
                  Creditos disenados para cada etapa de tu empresa
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Desde emprendedores hasta empresas consolidadas, tenemos el producto de financiamiento perfecto para impulsar tu crecimiento.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Credito para Emprendedores',
                  description: 'Capital estrategico para empresas en crecimiento con aprobacion rapida y requisitos flexibles.',
                  features: ['Aprobacion 24-48 horas', 'Montos flexibles', 'Asesoria dedicada'],
                  icon: Rocket,
                  accent: 'from-navy-700 to-navy-800'
                },
                {
                  title: 'Credito Inmobiliario',
                  description: 'Financia tus proyectos inmobiliarios con plazos competitivos y cobertura de seguros.',
                  features: ['Plazos hasta 20 anos', 'Cobertura de seguros', 'Analisis especializado'],
                  icon: Building2,
                  accent: 'from-emerald-500 to-emerald-600'
                },
                {
                  title: 'Credito de Libre Inversion',
                  description: 'Capital flexible sin restricciones para maximizar tus operaciones empresariales.',
                  features: ['Sin restricciones', 'Documentacion simple', 'Desembolso inmediato'],
                  icon: TrendingUp,
                  accent: 'from-navy-600 to-emerald-500'
                },
                {
                  title: 'Microcredito',
                  description: 'Soluciones agiles para pequenos negocios y emprendimientos con procesos simplificados.',
                  features: ['Requisitos minimos', 'Desembolso en 24h', 'Desde $500K COP'],
                  icon: Target,
                  accent: 'from-emerald-600 to-navy-700'
                }
              ].map((service, idx) => {
                const IconComponent = service.icon;
                return (
                  <AnimatedSection key={idx} delay={idx * 100}>
                    <div className="group relative h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-navy-700/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative h-full bg-white border border-slate-200 rounded-2xl p-8 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                        <div className={`w-12 h-12 bg-gradient-to-br ${service.accent} rounded-xl flex items-center justify-center mb-5 shadow-sm`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-navy-900 mb-3">{service.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">{service.description}</p>
                        <ul className="space-y-3">
                          {service.features.map((feature, fidx) => (
                            <li key={fidx} className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span className="text-sm text-slate-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-6 pt-6 border-t border-slate-100">
                          <button
                            onClick={onStartApplication}
                            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                          >
                            Solicitar este credito
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="seguridad" className="section-padding bg-navy-950 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />

          <div className="container-main relative z-10">
            <AnimatedSection>
              <div className="text-center mb-16 max-w-3xl mx-auto">
                <div className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 mx-auto">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Seguridad y Cumplimiento</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight text-balance">
                  Tu seguridad es nuestra prioridad absoluta
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Infraestructura de nivel bancario con los mas altos estandares de encriptacion, proteccion de fondos y cumplimiento normativo.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: Lock,
                  title: 'Encriptacion AES-256',
                  description: 'Todos los datos se protegen con encriptacion de grado militar, tanto en transito como en reposo.',
                  detail: 'TLS 1.3 + AES-256-GCM'
                },
                {
                  icon: Shield,
                  title: 'Cumplimiento Regulatorio',
                  description: 'Operamos bajo los marcos normativos de cada jurisdiccion con auditorias periodicas independientes.',
                  detail: 'SOC 2 Type II | PCI DSS'
                },
                {
                  icon: Server,
                  title: 'Proteccion de Fondos',
                  description: 'Los fondos de clientes estan segregados y respaldados por instituciones financieras reguladas.',
                  detail: 'Segregacion de fondos | FSCS'
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <AnimatedSection key={idx} delay={idx * 150}>
                    <div className="glass-card-dark p-8 h-full hover:border-emerald-500/30 transition-all duration-300 group">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 rounded-xl flex items-center justify-center mb-5 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed mb-4">{item.description}</p>
                      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">{item.detail}</span>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>

            <AnimatedSection delay={300}>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { icon: Eye, label: 'Monitoreo 24/7' },
                  { icon: FileCheck, label: 'KYC/AML Compliance' },
                  { icon: Award, label: 'ISO 27001' },
                  { icon: Shield, label: 'GDPR Ready' },
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-navy-800/40 border border-navy-700/30 rounded-xl px-5 py-4">
                      <Icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-300">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* About Us Section */}
        <section id="nosotros" className="section-padding bg-white">
          <div className="container-main">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <AnimatedSection>
                <div>
                  <div className="badge bg-navy-50 border border-navy-200 text-navy-700 mb-6">
                    <Users className="w-3.5 h-3.5" />
                    <span>Sobre Nosotros</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-6 tracking-tight text-balance">
                    Conoce, Invierte, Crece
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed mb-8">
                    Somos un equipo de profesionales con mas de 50 anos de experiencia combinada en finanzas, tecnologia e inversion. Nuestra mision es democratizar el acceso al credito corporativo en Latinoamerica.
                  </p>

                  <div className="space-y-6 mb-8">
                    {[
                      { icon: Target, title: 'Mision', text: 'Transformar el financiamiento corporativo en LATAM a traves de tecnologia e innovacion.' },
                      { icon: Eye, title: 'Vision', text: 'Ser la plataforma de credito lider en Latinoamerica, reconocida por transparencia y excelencia.' },
                      { icon: Award, title: 'Valores', text: 'Integridad, innovacion, transparencia y compromiso con el crecimiento de nuestros clientes.' },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className="flex gap-4 group">
                          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <Icon className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-navy-900 mb-1">{item.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Director General', role: 'CEO & Co-Founder', icon: Users },
                    { name: 'Dir. Financiero', role: 'CFO', icon: BarChart3 },
                    { name: 'Dir. Tecnologia', role: 'CTO', icon: Cpu },
                    { name: 'Dir. Cumplimiento', role: 'Compliance Officer', icon: Shield },
                  ].map((member, idx) => {
                    const Icon = member.icon;
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group">
                        <div className="w-16 h-16 bg-gradient-to-br from-navy-100 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-navy-200 group-hover:to-emerald-100 transition-colors">
                          <Icon className="w-8 h-8 text-navy-600" />
                        </div>
                        <p className="font-bold text-navy-900 text-sm mb-1">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Why Us Section */}
        <section className="section-padding bg-slate-50">
          <div className="container-main">
            <AnimatedSection>
              <div className="mb-16 max-w-2xl">
                <div className="badge bg-emerald-50 border border-emerald-200 text-emerald-700 mb-6">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Por Que Nosotros</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 tracking-tight text-balance">
                  Ventajas que marcan la diferencia
                </h2>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Cpu, title: 'Tecnologia IA', description: 'Analisis de credito en tiempo real con algoritmos de aprendizaje automatico para decisiones mas rapidas y precisas.' },
                { icon: Shield, title: 'Transparencia Total', description: 'Procesos regulados con tasas claras. Sin costos ocultos, sin sorpresas. Cada termino explicado.' },
                { icon: Users, title: 'Equipo Experto', description: 'Profesionales con 50+ anos de experiencia combinada en finanzas corporativas e inversion.' },
                { icon: BarChart3, title: 'Resultados Comprobados', description: '85% de aprobacion con seguimiento personalizado post-credito y metricas de impacto.' },
                { icon: Target, title: 'Soluciones Estrategicas', description: 'Asesoria integral enfocada en crecimiento empresarial sostenible a largo plazo.' },
                { icon: Globe, title: 'Red Global', description: 'Inversores y socios internacionales para oportunidades de expansion en multiples mercados.' },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <AnimatedSection key={idx} delay={idx * 80}>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group h-full">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-navy-900 mb-2 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section id="recursos" className="section-padding bg-white">
          <div className="container-main">
            <AnimatedSection>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="badge bg-navy-50 border border-navy-200 text-navy-700 mb-6">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Centro de Recursos</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-navy-900 tracking-tight">
                    Educacion financiera para tu crecimiento
                  </h2>
                </div>
                <a href="#" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Ver todos los articulos
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  category: 'Finanzas Corporativas',
                  title: 'Como estructurar tu credito corporativo de forma optima',
                  readTime: '8 min',
                  date: '15 Abr 2026'
                },
                {
                  category: 'Regulacion',
                  title: 'Nuevas normativas Fintech en Colombia: lo que debes saber',
                  readTime: '5 min',
                  date: '8 Abr 2026'
                },
                {
                  category: 'Crecimiento',
                  title: '5 estrategias para escalar tu empresa con financiamiento inteligente',
                  readTime: '6 min',
                  date: '1 Abr 2026'
                },
              ].map((article, idx) => (
                <AnimatedSection key={idx} delay={idx * 100}>
                  <article className="group cursor-pointer h-full">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">{article.category}</span>
                        <span className="text-xs text-slate-400">{article.readTime} lectura</span>
                      </div>
                      <h3 className="font-bold text-navy-900 mb-3 group-hover:text-emerald-700 transition-colors leading-snug flex-1">
                        {article.title}
                      </h3>
                      <p className="text-xs text-slate-400">{article.date}</p>
                    </div>
                  </article>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-padding bg-slate-50 border-y border-slate-200/60">
          <div className="container-main">
            <AnimatedSection>
              <div className="text-center mb-16 max-w-2xl mx-auto">
                <div className="badge bg-emerald-50 border border-emerald-200 text-emerald-700 mb-6 mx-auto">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Testimonios</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-navy-900 tracking-tight">
                  Lo que dicen nuestros clientes
                </h2>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Simbiosis nos proporciono el financiamiento estrategico que necesitabamos para escalar en tres paises. Su tecnologia agilizo todo el proceso.',
                  author: 'Director Ejecutivo',
                  company: 'Empresa de Tecnologia'
                },
                {
                  quote: 'El proceso fue agil, transparente y el equipo nos acompano en cada paso. La infraestructura de seguridad nos dio total confianza.',
                  author: 'Fundador y CEO',
                  company: 'StartUp de Logistica'
                },
                {
                  quote: 'La asesoria de Simbiosis fue clave para optimizar nuestra estructura de financiamiento. Resultados comprobados desde el primer mes.',
                  author: 'Gerente Financiero',
                  company: 'Empresa Inmobiliaria'
                }
              ].map((testimonial, idx) => (
                <AnimatedSection key={idx} delay={idx * 100}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-emerald-500 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 italic flex-1">"{testimonial.quote}"</p>
                    <div className="border-t border-slate-100 pt-5">
                      <p className="font-bold text-navy-900 text-sm">{testimonial.author}</p>
                      <p className="text-slate-500 text-xs mt-1">{testimonial.company}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2" />
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-navy-500/10 rounded-full blur-[100px]" />
          </div>

          <div className="container-main relative z-10">
            <AnimatedSection>
              <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden border border-navy-700/40">
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '32px 32px'
                }} />

                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-navy-400/10 rounded-full blur-[60px]" />

                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight text-balance">
                    Comienza tu transformacion financiera
                  </h2>
                  <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
                    Solicita tu credito hoy y accede a soluciones financieras disenadas para empresas como la tuya. Proceso 100% digital.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={onStartApplication}
                      className="btn-primary !px-10 !py-4 !text-base inline-flex items-center justify-center gap-2"
                    >
                      Solicitar Credito
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDemoModalOpen(true)}
                      className="border-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400/60 px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2"
                    >
                      <Calculator className="w-5 h-5" />
                      Simular Credito
                    </button>
                    <button
                      onClick={handleWhatsAppClick}
                      className="border-2 border-slate-500/40 text-white hover:bg-white/5 hover:border-slate-400/60 px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2"
                    >
                      Hablar con un Asesor
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Contact Section */}
        <section className="section-padding bg-white border-t border-slate-200/60">
          <div className="container-main">
            <AnimatedSection>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm mb-1">Email</h3>
                    <p className="text-sm text-slate-600">a@simbiosis.la</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm mb-1">Telefono</h3>
                    <p className="text-sm text-slate-600">+57 319 7987310</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm mb-1">Oficina</h3>
                    <p className="text-sm text-slate-600">Guatavita, Colombia</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-navy-950 text-white py-16 border-t border-navy-800">
          <div className="container-main">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-gradient-to-br from-navy-600 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-white">Simbiosis</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">Conoce, Invierte, Crece.</p>
                <p className="text-slate-500 text-xs leading-relaxed">Transformando el financiamiento corporativo en LATAM con tecnologia e innovacion.</p>
              </div>
              <div>
                <h4 className="font-bold text-white mb-5 text-sm">Soluciones</h4>
                <ul className="space-y-3 text-slate-400 text-sm">
                  <li><a href="#soluciones" className="hover:text-emerald-400 transition-colors">Credito Emprendedores</a></li>
                  <li><a href="#soluciones" className="hover:text-emerald-400 transition-colors">Credito Inmobiliario</a></li>
                  <li><a href="#soluciones" className="hover:text-emerald-400 transition-colors">Libre Inversion</a></li>
                  <li><a href="#soluciones" className="hover:text-emerald-400 transition-colors">Microcredito</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-5 text-sm">Empresa</h4>
                <ul className="space-y-3 text-slate-400 text-sm">
                  <li><a href="#nosotros" className="hover:text-emerald-400 transition-colors">Sobre Nosotros</a></li>
                  <li><a href="#seguridad" className="hover:text-emerald-400 transition-colors">Seguridad</a></li>
                  <li><a href="#recursos" className="hover:text-emerald-400 transition-colors">Recursos</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Carreras</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-5 text-sm">Legal</h4>
                <ul className="space-y-3 text-slate-400 text-sm">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Terminos de Servicio</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Politica de Privacidad</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Politica de Cookies</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Disclosures</a></li>
<li className="mt-4 border-t border-slate-700/50 pt-4">
  <a 
    href="?admin=true" 
    className="hover:text-emerald-400 transition-colors flex items-center gap-2"
  >
    Acceso Admin
  </a>
</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-navy-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-xs">
                &copy; 2026 Simbiosis SAS. Todos los derechos reservados. Financiamiento inteligente para empresas que crecen.
              </p>
              <div className="flex items-center gap-4">
              </div>
            </div>
          </div>
        </footer>
      </main>

      <CreditDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onApply={onStartApplication}
      />
    </div>
  );
}
