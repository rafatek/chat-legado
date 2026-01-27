# ProspektAI - Prospecção Inteligente com IA

ProspektAI é uma plataforma SaaS completa de automação de prospecção com inteligência artificial, projetada para ajudar equipes de vendas e marketing a gerenciar leads, clientes e campanhas de outreach de forma eficiente e automatizada.

## 🚀 Visão Geral

ProspektAI é um sistema de CRM e automação de prospecção que combina inteligência artificial com ferramentas poderosas de extração de leads de múltiplas fontes. A plataforma oferece uma solução completa para empresas que desejam automatizar sua prospecção comercial e aumentar sua eficiência de vendas.

## ✨ Funcionalidades Principais

### 📊 Dashboard
- Painel completo com métricas e indicadores de desempenho
- Acompanhamento em tempo real do pipeline de vendas
- Visualização de dados com gráficos interativos

### 👥 Gestão de Leads
- Extração de leads do Google Maps
- Extração de leads do Instagram
- Extração de leads via CNPJ (dados de empresas brasileiras)
- Importação e exportação de leads
- Filtros avançados e segmentação
- Pastas organizáveis e paginação de alta performance
- Sistema de movimentação em massa de leads

### 📋 CRM Kanban
- Sistema de gerenciamento de clientes em formato Kanban
- Etapas personalizáveis de prospecção
- Acompanhamento de oportunidades
- Integração com agentes de IA

### 🔗 Conexões
- Integração com provedores de e-mail (SMTP)
- Conexão com APIs de redes sociais
- Configuração de contas de redes sociais para automação
- Gerenciamento de Campanhas com escala lateral e múltiplos servidores
- Sistema de distribuição inteligente de carga

### 🤖 Agentes de IA
- **Agente de Prospecção**: Automatiza o envio de mensagens personalizadas para leads
- **Agente de Atendimento**: Responde a perguntas frequentes e encaminha leads qualificados
- Personalização de scripts e modelos de mensagem
- Integração com APIs de IA (OpenAI, etc.)
- **Central de Agentes (Hub)**: Nova interface unificada para configuração e gerenciamento
- Preview em tempo real das configurações do agente

### ⚙️ Ferramentas
- **Extrator do Maps**: Busca empresas e contatos no Google Maps
- **Extrator de Instagram**: Extrai informações de perfis e seguidores do Instagram
- **Extrator de CNPJ**: Obtém dados de empresas brasileiras via CNPJ
- Ferramentas de limpeza e validação de dados

### 👤 Conta e Assinatura
- Gerenciamento de perfil e preferências
- Planos de assinatura com diferentes limites
- Histórico de uso e consumo de créditos
- Configurações de segurança

### 🎯 Suporte
- Central de ajuda e documentação
- Chat de suporte
- Relatórios de uso e desempenho

### 🚀 Onboarding & Experiência
- **Tutorial Interativo**: Tour guiado para novos usuários
- Interface com efeitos visuais avançados (Blur, Glow, Spotlight)
- Design system coeso e responsivo (Glassmorphism)

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios
```
prospektai/
├── app/                    # Rotas e páginas da aplicação (Next.js App Router)
│   ├── (auth)/            # Páginas de autenticação
│   ├── (dashboard)/       # Páginas do dashboard protegido
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout raiz da aplicação
│   └── page.tsx           # Página inicial
├── components/            # Componentes reutilizáveis
├── hooks/                 # Hooks personalizados
├── lib/                   # Bibliotecas e utilitários
├── public/                # Arquivos estáticos
├── styles/                # Estilos específicos
├── types/                 # Tipos TypeScript
├── middleware.ts          # Middleware de autenticação
└── ...
```

### Tecnologias Utilizadas

#### Frontend
- **[Next.js 16](https://nextjs.org/)** - Framework React com App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[React 19](https://react.dev/)** - Biblioteca para interfaces de usuário
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework de estilização
- **[Radix UI](https://www.radix-ui.com/)** - Componentes acessíveis
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes pré-construídos
- **[Lucide React](https://lucide.dev/)** - Ícones SVG

#### Backend & Autenticação
- **[Supabase](https://supabase.io/)** - Backend como serviço (PostgreSQL + Auth)
- **[Supabase Auth](https://supabase.com/auth)** - Sistema de autenticação
- **[Supabase Database](https://supabase.com/database)** - Banco de dados PostgreSQL

#### Gerenciamento de Estado e Formulários
- **[React Hook Form](https://react-hook-form.com/)** - Gerenciamento de formulários
- **[Zod](https://zod.dev/)** - Validação de esquemas

#### Visualização de Dados
- **[Recharts](https://recharts.org/)** - Biblioteca de gráficos
- **[React Day Picker](https://react-day-picker.js.org/)** - Seletor de datas

#### Outras Bibliotecas
- **[Framer Motion](https://www.framer.com/motion/)** - Animações
- **[React Beautiful DnD](https://github.com/atlassian/react-beautiful-dnd)** - Arrastar e soltar
- **[Vaul](https://vaul.emilkowal.ski/)** - Componentes de drawer móvel
- **[Sonner](https://sonner.emilkowal.ski/)** - Notificações toast
- **[CmdK](https://cmdk.paco.me/)** - Menu de comando

## 🛠️ Configuração do Ambiente

### Pré-requisitos
- Node.js 18+ 
- pnpm (recomendado) ou npm/yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/rafatek/prospektai.git
cd prospektai
```

2. Instale as dependências:
```bash
pnpm install
# ou
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Edite o arquivo `.env.local` com suas credenciais:
```env
NEXT_PUBLIC_SUPABASE_URL= # URL do seu projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Chave anônima do Supabase
```

5. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
# ou
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

## 📊 Banco de Dados

O projeto utiliza o Supabase como backend, que inclui:
- PostgreSQL como banco de dados relacional
- Autenticação e autorização
- Funções de banco de dados
- Storage de arquivos
- APIs REST e GraphQL

### Estrutura de Tabelas (Exemplo)
- `users` - Informações de autenticação dos usuários
- `profiles` - Perfil completo dos usuários
- `leads` - Dados dos leads capturados
- `campaigns` - Campanhas de prospecção
- `messages` - Mensagens enviadas/recebidas
- `subscriptions` - Informações de assinatura

## 🔐 Autenticação

O sistema utiliza o Supabase Auth para gerenciar autenticação de usuários com:
- Login e cadastro com e-mail e senha
- Recuperação de senha
- Middleware de proteção de rotas
- Guardião de assinatura para funcionalidades pagas

## 🎨 Design System

A interface utiliza:
- Componentes acessíveis do Radix UI
- Estilos consistentes com Tailwind CSS
- Tema claro e escuro (dark mode)
- Componentes responsivos para todos os dispositivos
- Animações suaves com Framer Motion

## 🚀 Deploy

### Vercel (Recomendado)
O projeto está otimizado para deploy no Vercel:

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. O Vercel fará o build e deploy automaticamente

### Outros provedores
O projeto também pode ser deployado em qualquer provedor que suporte Next.js (Netlify, AWS, etc.)

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, entre em contato:
- E-mail: rafatek1424@gmail.com
- GitHub: [rafatek](https://github.com/rafatek)

## 🙏 Agradecimentos

- Agradecemos ao ecossistema open-source que torna este projeto possível
- Agradecemos ao time do Supabase por fornecer uma plataforma backend poderosa
- Agradecemos à comunidade Next.js por manter um framework incrível