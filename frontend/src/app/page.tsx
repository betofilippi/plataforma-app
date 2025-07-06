import { Metadata } from 'next'
import Dashboard from '@/components/Dashboard'

export const metadata: Metadata = {
  title: 'Plataforma ERP NXT | Dashboard Principal',
  description: 'Dashboard centralizado do ERP para gestão de importações, vendas e relacionamento com clientes',
}

export default function HomePage() {
  return <Dashboard />
}