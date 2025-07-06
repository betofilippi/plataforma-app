# Frontend - Plataforma ERP NXT

## 🎯 Visão Geral

Interface web React + Next.js + TypeScript que fornece acesso completo ao ERP integrado, dashboards em tempo real, gestão de leads/clientes e comunicação omnichannel unificada.

## 🏗️ Arquitetura

```
frontend/
├── 📁 src/                         # Código fonte principal
│   ├── 📄 app.tsx                  # App component principal
│   ├── 📄 index.tsx                # Entry point React
│   └── 📄 globals.css              # Estilos globais
├── 📁 pages/                       # Páginas Next.js
│   ├── 📄 index.tsx                # Dashboard principal
│   ├── 📄 _app.tsx                 # App wrapper
│   ├── 📄 _document.tsx            # Document customizado
│   └── 📁 api/                     # API routes Next.js
├── 📁 components/                  # Componentes React
│   ├── 📁 ui/                      # Componentes base UI
│   ├── 📁 forms/                   # Formulários
│   ├── 📁 layout/                  # Layout components
│   ├── 📁 dashboard/               # Dashboard widgets
│   └── 📁 modals/                  # Modais e overlays
├── 📁 hooks/                       # Custom React hooks
│   ├── 📄 useAuth.ts               # Autenticação
│   ├── 📄 useApi.ts                # Chamadas API
│   ├── 📄 useWebhooks.ts           # WebSocket/webhooks
│   └── 📄 useLocalStorage.ts       # Storage local
├── 📁 stores/                      # Estado global
│   ├── 📄 authStore.ts             # Estado autenticação
│   ├── 📄 uiStore.ts               # Estado da UI
│   ├── 📄 dataStore.ts             # Cache de dados
│   └── 📄 notificationStore.ts     # Notificações
├── 📁 services/                    # Serviços frontend
│   ├── 📄 apiClient.ts             # Cliente HTTP
│   ├── 📄 authService.ts           # Serviços auth
│   ├── 📄 websocketService.ts      # WebSocket client
│   └── 📄 notificationService.ts   # Push notifications
├── 📁 utils/                       # Utilitários frontend
│   ├── 📄 constants.ts             # Constantes
│   ├── 📄 helpers.ts               # Funções auxiliares
│   ├── 📄 formatters.ts            # Formatação dados
│   └── 📄 validators.ts            # Validações client
└── 📁 modules/                     # Módulos ERP organizados
    ├── 📁 cad/                     # Cadastros
    ├── 📁 cmp/                     # Compras  
    ├── 📁 est/                     # Estoque
    ├── 📁 fis/                     # Fiscal
    ├── 📁 imp/                     # Importação
    ├── 📁 loc/                     # Localização
    ├── 📁 log/                     # Logística
    ├── 📁 prd/                     # Produção
    ├── 📁 pro/                     # Projetos
    ├── 📁 vnd/                     # Vendas
    ├── 📁 whk/                     # Webhooks
    └── 📁 spt/                     # Suporte
```

## 🔧 Tecnologias Utilizadas

- **Framework**: Next.js 14+ (App Router)
- **Runtime**: React 18+
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Estado Global**: Zustand
- **Formulários**: React Hook Form + Zod
- **Autenticação**: Supabase Auth
- **Requisições**: TanStack Query (React Query)
- **Gráficos**: Recharts / Chart.js
- **Notificações**: React Hot Toast
- **Testes**: Jest + Testing Library
- **Build**: Webpack + SWC

## 📋 Módulos Frontend

### **Dashboard Principal**
- Visão geral de KPIs em tempo real
- Gráficos de vendas e performance
- Alertas e notificações importantes
- Quick actions para tarefas frequentes

### **CAD - Cadastros**
- Interface para clientes, fornecedores, produtos
- Gestão de leads com pipeline visual
- Formulários dinâmicos de cadastro
- Histórico de interações

### **IMP - Importação**
- Tracking visual de processos
- Upload e gestão de documentos
- Dashboard de custos e prazos
- Integração com despachantes

### **VND - Vendas**
- Pipeline de vendas interativo
- Integração com marketplaces
- Faturamento e cobrança
- Relatórios de performance

### **WHK - Comunicação**
- Central de mensagens unificada
- Chat com clientes (WhatsApp/Instagram)
- Templates de resposta
- Histórico omnichannel

### **SPT - Suporte**
- Sistema de tickets
- Base de conhecimento
- SLA e escalação
- Atendimento em tempo real

## 🚀 Configuração e Uso

### **Instalação**
```bash
cd frontend
npm install
```

### **Configuração**
```bash
# Copiar exemplo de configuração
cp .env.local.example .env.local

# Editar variáveis necessárias
nano .env.local
```

### **Desenvolvimento**
```bash
# Modo desenvolvimento
npm run dev

# Storybook (componentes)
npm run storybook

# Build de produção
npm run build

# Executar build
npm start
```

### **Testes**
```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes com coverage
npm run test:coverage

# Testes E2E
npm run test:e2e
```

## 🎨 Design System

### **Componentes Base**
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

// components/ui/DataTable.tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination?: boolean
  sorting?: boolean
  filtering?: boolean
}
```

### **Layout Components**
```typescript
// components/layout/AppLayout.tsx
const AppLayout: FC<{children: ReactNode}> = ({children}) => (
  <div className="min-h-screen bg-gray-50">
    <Header />
    <Sidebar />
    <main className="ml-64 pt-16">
      {children}
    </main>
  </div>
)

// components/layout/ModuleLayout.tsx
const ModuleLayout: FC<ModuleLayoutProps> = ({
  title, 
  actions,
  children
}) => (
  <div className="p-6">
    <PageHeader title={title} actions={actions} />
    {children}
  </div>
)
```

## 📡 Integração com Backend

### **API Client**
```typescript
// services/apiClient.ts
class ApiClient {
  private baseURL: string
  private authToken: string | null

  async get<T>(endpoint: string): Promise<T>
  async post<T>(endpoint: string, data: any): Promise<T>
  async put<T>(endpoint: string, data: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
}

export const apiClient = new ApiClient()
```

### **Custom Hooks**
```typescript
// hooks/useClientes.ts
export const useClientes = () => {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: () => apiClient.get('/api/cad/clientes'),
    staleTime: 5 * 60 * 1000 // 5 minutos
  })
}

// hooks/useCreateCliente.ts
export const useCreateCliente = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateClienteData) => 
      apiClient.post('/api/cad/clientes', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes'])
    }
  })
}
```

## 🔒 Segurança Frontend

### **Autenticação**
```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const authStore = useAuthStore()
  
  const login = async (email: string, password: string) => {
    const { data } = await supabase.auth.signInWithPassword({
      email, password
    })
    authStore.setUser(data.user)
    authStore.setSession(data.session)
  }
  
  const logout = async () => {
    await supabase.auth.signOut()
    authStore.clear()
  }
  
  return { login, logout, user: authStore.user }
}
```

### **Proteção de Rotas**
```typescript
// components/ProtectedRoute.tsx
const ProtectedRoute: FC<{children: ReactNode, modules?: string[]}> = ({
  children, modules
}) => {
  const { user, permissions } = useAuth()
  
  if (!user) return <LoginPage />
  
  if (modules && !hasPermissions(permissions, modules)) {
    return <UnauthorizedPage />
  }
  
  return <>{children}</>
}
```

## 📊 Estado Global

### **Auth Store**
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null
  session: Session | null
  permissions: string[]
  setUser: (user: User) => void
  setSession: (session: Session) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  permissions: [],
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  clear: () => set({ user: null, session: null, permissions: [] })
}))
```

### **UI Store**
```typescript
// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Notification[]
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (notification: Notification) => void
}
```

## 🎭 Formulários

### **Formulário com Validação**
```typescript
// components/forms/ClienteForm.tsx
const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone obrigatório')
})

type ClienteFormData = z.infer<typeof clienteSchema>

const ClienteForm: FC<{onSubmit: (data: ClienteFormData) => void}> = ({
  onSubmit
}) => {
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema)
  })
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('nome')} />
      <Input {...form.register('email')} />
      <Input {...form.register('telefone')} />
      <Button type="submit">Salvar</Button>
    </form>
  )
}
```

## 📱 Responsividade

### **Breakpoints**
```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

.container {
  @apply mx-auto px-4 sm:px-6 lg:px-8;
}

/* Mobile First */
@screen sm { /* >= 640px */ }
@screen md { /* >= 768px */ }
@screen lg { /* >= 1024px */ }
@screen xl { /* >= 1280px */ }
```

### **Componentes Responsivos**
```typescript
// components/responsive/MobileNavigation.tsx
const MobileNavigation = () => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
    <div className="grid grid-cols-5 py-2">
      {navigationItems.map((item) => (
        <NavItem key={item.id} {...item} />
      ))}
    </div>
  </nav>
)
```

## 🔄 WebSockets / Tempo Real

### **WebSocket Service**
```typescript
// services/websocketService.ts
class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: Map<string, Function[]> = new Map()
  
  connect(url: string) {
    this.ws = new WebSocket(url)
    this.ws.onmessage = this.handleMessage.bind(this)
  }
  
  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }
  
  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data)
    const callbacks = this.listeners.get(data.type) || []
    callbacks.forEach(callback => callback(data.payload))
  }
}
```

## 📚 Documentação de Componentes

### **Storybook**
```typescript
// stories/Button.stories.ts
export default {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger']
    }
  }
}

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Button'
  }
}
```

## 🐛 Debug e Desenvolvimento

### **DevTools**
```typescript
// utils/devtools.ts
export const enableDevtools = () => {
  if (process.env.NODE_ENV === 'development') {
    // React Query Devtools
    // Zustand Devtools
    // React Hook Form DevTools
  }
}
```

### **Performance**
```typescript
// hooks/usePerformance.ts
export const usePerformance = (componentName: string) => {
  useEffect(() => {
    performance.mark(`${componentName}-start`)
    
    return () => {
      performance.mark(`${componentName}-end`)
      performance.measure(
        componentName,
        `${componentName}-start`,
        `${componentName}-end`
      )
    }
  }, [componentName])
}
```

## 📊 Scripts Utilitários

```bash
# Analisar bundle
npm run analyze

# Verificar tipos TypeScript
npm run type-check

# Linting
npm run lint

# Formatação código
npm run format

# Gerar componente
npm run generate:component ComponentName

# Gerar página
npm run generate:page page-name
```

## 📚 Documentação Adicional

- 🎨 [Style Guide](./docs/style-guide.md)
- 🧩 [Component Library](./docs/components.md)
- 📱 [Mobile Guidelines](./docs/mobile.md)
- ⚡ [Performance Guide](./docs/performance.md)

---

**Versão**: 1.0  
**Mantenedores**: Equipe Frontend NXT  
**Última Atualização**: 2025-07-05