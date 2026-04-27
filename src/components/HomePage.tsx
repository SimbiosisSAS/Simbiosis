import { useState } from 'react';
import { ArrowRight, TrendingUp, Building2, Target, Zap, Shield, BarChart3, Users, Globe, MessageCircle, ChevronRight, CheckCircle, Sparkles, Rocket } from 'lucide-react';

interface HomePageProps {
  onStartApplication: () => void;
}

export default function HomePage({ onStartApplication }: HomePageProps) {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/57', '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-brand-orange/20 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-red to-brand-orange rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Simbiosis</span>
          </div>
          <div className="hidden lg:flex items-center gap-12">
            <a href="#servicios" className="text-gray-600 hover:text-brand-red transition-colors font-medium text-sm">Servicios</a>
            <a href="#impacto" className="text-gray-600 hover:text-brand-red transition-colors font-medium text-sm">Impacto</a>
            <a href="#por-que" className="text-gray-600 hover:text-brand-red transition-colors font-medium text-sm">¿Por Qué</a>
          </div>
          <button
            onClick={onStartApplication}
            className="bg-gradient-to-r from-brand-red to-brand-orange hover:from-brand-red/90 hover:to-brand-orange/90 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-red/30"
          >
            Solicitar Crédito
          </button>
        </div>
      </nav>

      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-brand-red to-brand-orange hover:from-brand-red/90 hover:to-brand-orange/90 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:shadow-brand-red/30 transition-all z-40 flex items-center justify-center hover:scale-110"
        title="Contáctanos por WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <main>
        <section className="relative pt-32 pb-24">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-brand-red/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-brand-red/30">
                  <Rocket className="w-4 h-4 text-brand-red" />
                  <span className="text-sm font-semibold text-brand-red uppercase tracking-widest">Próxima Generación de Finanzas</span>
                </div>

                <h1 className="text-7xl font-bold text-gray-900 leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-brand-red via-brand-orange to-brand-coral">
                  Financiamiento Inteligente
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
                  Plataforma de crédito corporativo impulsada por IA. Aprobación rápida, términos flexibles y soluciones diseñadas para empresas en crecimiento en Latinoamérica.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={onStartApplication}
                    className="bg-gradient-to-r from-brand-red to-brand-orange hover:from-brand-red/90 hover:to-brand-orange/90 text-white px-8 py-3 rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-red/30 inline-flex items-center gap-2"
                  >
                    Solicitar Crédito
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleWhatsAppClick}
                    className="border border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 px-8 py-3 rounded-lg text-sm font-semibold transition-all"
                  >
                    Contactar
                  </button>
                </div>
              </div>

              <div className="lg:flex justify-end hidden">
                <div className="w-full max-w-md relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-red to-brand-orange rounded-2xl blur-2xl opacity-15"></div>
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 flex items-center justify-center h-80 border border-gray-200">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange mb-2">∞</div>
                      <p className="text-gray-600 text-sm font-medium">Soluciones Infinitas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-y border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="group">
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-red to-brand-orange mb-2">$7M+</p>
                <p className="text-gray-600 text-sm font-medium group-hover:text-gray-700 transition-colors">Capital Levantado en LATAM & Canadá</p>
              </div>
              <div className="group">
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-red to-brand-orange mb-2">12+</p>
                <p className="text-gray-600 text-sm font-medium group-hover:text-gray-700 transition-colors">Negocios Latinoamericanos Fortalecidos</p>
              </div>
              <div className="group">
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-red to-brand-orange mb-2">3</p>
                <p className="text-gray-600 text-sm font-medium group-hover:text-gray-700 transition-colors">Países Servidos</p>
              </div>
              <div className="group">
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-red to-brand-orange mb-2">98%</p>
                <p className="text-gray-600 text-sm font-medium group-hover:text-gray-700 transition-colors">Satisfacción de Clientes</p>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 bg-brand-orange/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-brand-orange/30">
                <Zap className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-semibold text-brand-orange uppercase tracking-widest">Soluciones</span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Créditos Diseñados para Ti
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl">
                Desde emprendedores hasta empresas consolidadas, tenemos el producto de financiamiento perfecto para tu etapa.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Crédito para Emprendedores',
                  description: 'Capital estratégico para empresas en crecimiento con aprobación rápida.',
                  features: ['Aprobación 24-48 horas', 'Montos flexibles', 'Asesoría dedicada'],
                  icon: Rocket
                },
                {
                  title: 'Crédito Inmobiliario',
                  description: 'Financia tus proyectos inmobiliarios con plazos competitivos.',
                  features: ['Plazos hasta 20 años', 'Cobertura de seguros', 'Análisis especializado'],
                  icon: Building2
                },
                {
                  title: 'Crédito de Libre Inversión',
                  description: 'Capital flexible sin restricciones para maximizar tus operaciones.',
                  features: ['Sin restricciones', 'Documentación simple', 'Desembolso inmediato'],
                  icon: TrendingUp
                },
                {
                  title: 'Microcrédito',
                  description: 'Soluciones ágiles para pequeños negocios y emprendimientos.',
                  features: ['Requisitos mínimos', 'Desembolso en 24h', 'Desde $500K'],
                  icon: Target
                }
              ].map((service, idx) => {
                const IconComponent = service.icon;
                return (
                  <div key={idx} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-red/10 to-brand-orange/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-white border border-gray-200 rounded-xl p-8 hover:border-brand-red/50 hover:shadow-lg transition-all">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-red to-brand-orange rounded-lg flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-6">{service.description}</p>
                      <ul className="space-y-3">
                        {service.features.map((feature, fidx) => (
                          <li key={fidx} className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-brand-orange flex-shrink-0" />
                            <span className="text-sm text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="impacto" className="py-24 relative overflow-hidden bg-gray-50">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 bg-brand-red/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-brand-red/30">
                <Globe className="w-4 h-4 text-brand-red" />
                <span className="text-sm font-semibold text-brand-red uppercase tracking-widest">Impacto Global</span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Transformando Finanzas en LATAM
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-8 hover:border-brand-red/50 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-red to-brand-orange rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Comunidad Global</h3>
                <p className="text-gray-600">Miles de emprendedores y empresas nos confían para alcanzar sus objetivos de crecimiento exponencial.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-8 hover:border-brand-orange/50 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-orange to-brand-coral rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Crecimiento Sostenible</h3>
                <p className="text-gray-600">Operaciones de doble dígito anual con resultados comprobados en múltiples mercados latinoamericanos.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-8 hover:border-brand-red/50 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-red to-brand-coral rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Expansión Regional</h3>
                <p className="text-gray-600">Presencia en mercados clave de LATAM y Norteamérica con planes de expansión agresiva.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="por-que" className="py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 bg-brand-orange/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-brand-orange/30">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-semibold text-brand-orange uppercase tracking-widest">Por Qué Nosotros</span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900">
                Ventajas Que Marcan la Diferencia
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: Zap,
                  title: 'Tecnología IA',
                  description: 'Análisis de crédito en tiempo real con algoritmos de aprendizaje automático.',
                  color: 'from-brand-red to-brand-orange'
                },
                {
                  icon: Shield,
                  title: 'Transparencia Total',
                  description: 'Procesos regulados con tasas claras. Sin costos ocultos, sin sorpresas.',
                  color: 'from-brand-orange to-brand-coral'
                },
                {
                  icon: Users,
                  title: 'Equipo Experto',
                  description: 'Profesionales con 50+ años de experiencia en finanzas e inversión.',
                  color: 'from-brand-red to-brand-coral'
                },
                {
                  icon: BarChart3,
                  title: 'Resultados Comprobados',
                  description: '85% de aprobación con seguimiento personalizado post-crédito.',
                  color: 'from-brand-coral to-brand-orange'
                },
                {
                  icon: Target,
                  title: 'Soluciones Estratégicas',
                  description: 'Asesoría integral enfocada en crecimiento empresarial sostenible.',
                  color: 'from-brand-red to-brand-coral'
                },
                {
                  icon: Globe,
                  title: 'Red Global',
                  description: 'Inversores y socios internacionales para oportunidades de expansión.',
                  color: 'from-brand-orange to-brand-red'
                }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="flex gap-4 group">
                    <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-brand-red transition-colors">{item.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 border-y border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-brand-red/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-brand-red/30">
                <MessageCircle className="w-4 h-4 text-brand-red" />
                <span className="text-sm font-semibold text-brand-red uppercase tracking-widest">Testimonios</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Lo que Dicen Nuestros Clientes</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: 'Simbiosis nos proporcionó el financiamiento estratégico que necesitábamos para escalar en tres países.',
                  author: 'Director Ejecutivo',
                  company: 'Empresa de Tecnología'
                },
                {
                  quote: 'El proceso fue ágil, transparente y el equipo nos acompañó en cada paso. Recomendamos sin dudarlo.',
                  author: 'Fundador y CEO',
                  company: 'StartUp de Logística'
                },
                {
                  quote: 'La asesoría de Simbiosis fue clave para optimizar nuestra estructura de financiamiento.',
                  author: 'Gerente Financiero',
                  company: 'Empresa Inmobiliaria'
                }
              ].map((testimonial, idx) => (
                <div key={idx} className="bg-white p-8 rounded-xl border border-gray-200 hover:border-brand-orange/50 hover:shadow-lg transition-all group">
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 italic group-hover:text-gray-700 transition-colors">"{testimonial.quote}"</p>
                  <div className="border-t border-gray-200 pt-6">
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.author}</p>
                    <p className="text-gray-500 text-xs mt-1">{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-orange/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="bg-gradient-to-br from-brand-red to-brand-orange rounded-2xl p-16 text-center text-white border border-brand-red/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-brand-coral/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10">
                <h2 className="text-4xl font-bold mb-4">Comienza Tu Transformación</h2>
                <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                  Solicita tu crédito hoy y accede a soluciones financieras diseñadas para empresas como la tuya.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={onStartApplication}
                    className="bg-white text-brand-red hover:bg-gray-100 px-8 py-3 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                  >
                    Solicitar Crédito
                  </button>
                  <button
                    onClick={handleWhatsAppClick}
                    className="border border-white text-white hover:bg-white/20 px-8 py-3 rounded-lg text-sm font-semibold transition-all"
                  >
                    Contactar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-16 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-gradient-to-br from-brand-red to-brand-orange rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Simbiosis</h3>
                </div>
                <p className="text-gray-400 text-sm">Conoce, Invierte, Crece.</p>
                <p className="text-gray-500 text-xs mt-3">Transformando el financiamiento corporativo en LATAM.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Soluciones</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#servicios" className="hover:text-brand-orange transition-colors">Créditos</a></li>
                  <li><a href="#" className="hover:text-brand-orange transition-colors">Inversión</a></li>
                  <li><a href="#" className="hover:text-brand-orange transition-colors">Asesoría</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Empresa</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#impacto" className="hover:text-brand-orange transition-colors">Impacto</a></li>
                  <li><a href="#por-que" className="hover:text-brand-orange transition-colors">Sobre Nosotros</a></li>
                  <li><a href="#" className="hover:text-brand-orange transition-colors">Equipo</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Contacto</h4>
                <p className="text-gray-400 text-sm mb-2">Email: info@simbiosis.com</p>
                <p className="text-gray-400 text-sm">Colombia • LATAM</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-500 text-xs text-center">
                © 2024 Simbiosis SAS. Todos los derechos reservados. Financiamiento inteligente para empresas que crecen.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
