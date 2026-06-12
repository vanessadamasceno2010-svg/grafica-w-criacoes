import React, { useMemo, useState } from 'react';
import { mockProducts, formatMoney, mockCategories } from '../../lib/api';

const statuses = ['pendente', 'confirmado', 'em_producao', 'pronto', 'enviado', 'entregue'];

type AdminItem = {
  id: string;
  nome: string;
  categoria?: string;
  email?: string;
  telefone?: string;
  preco?: number;
  estoque?: number;
  status?: string;
  total?: number;
  slug?: string;
};

function uid() {
  return String(Date.now() + Math.floor(Math.random() * 999));
}

export function Dashboard() {
  const cards = [
    ['Vendas do mês', 'R$ 28.450,00'],
    ['Pedidos do mês', '184'],
    ['Ticket médio', 'R$ 154,61'],
    ['Clientes novos', '72'],
    ['Produtos em estoque', '3.000'],
    ['Pedidos pendentes', '18']
  ];

  return (
    <AdminPage title="Dashboard">
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {cards.map(([a, b]) => (
          <div className="card p-5 md:p-6" key={a}>
            <p className="text-gray-500">{a}</p>
            <b className="text-2xl md:text-3xl text-primary">{b}</b>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 md:gap-6 mt-6">
        <Panel title="Vendas por período" />
        <Panel title="Status dos pedidos" />
      </div>
    </AdminPage>
  );
}

export function Produtos() {
  const [items, setItems] = useState<AdminItem[]>(
    mockProducts.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria_nome || 'Sem categoria',
      preco: p.preco,
      estoque: p.estoque,
      status: p.estoque > 0 ? 'Ativo' : 'Inativo'
    }))
  );
  const [modal, setModal] = useState<{ type: 'view' | 'edit' | 'new'; item?: AdminItem } | null>(null);

  function save(item: AdminItem) {
    if (modal?.type === 'new') {
      setItems([{ ...item, id: uid(), status: item.status || 'Ativo' }, ...items]);
    } else {
      setItems(items.map((p) => (p.id === item.id ? item : p)));
    }
    setModal(null);
  }

  function remove(item: AdminItem) {
    if (confirm(`Deseja deletar ${item.nome}?`)) {
      setItems(items.filter((p) => p.id !== item.id));
    }
  }

  return (
    <AdminPage title="Gerenciador de Produtos">
      <button className="btn btn-primary mb-5" onClick={() => setModal({ type: 'new' })}>
        Novo Produto
      </button>

      <Table
        heads={['Nome', 'Categoria', 'Preço', 'Estoque', 'Status', 'Ações']}
        rows={items.map((p) => [
          p.nome,
          p.categoria,
          formatMoney(p.preco || 0),
          p.estoque || 0,
          p.status || 'Ativo',
          <Actions
            onView={() => setModal({ type: 'view', item: p })}
            onEdit={() => setModal({ type: 'edit', item: p })}
            onDelete={() => remove(p)}
          />
        ])}
      />

      {modal && (
        <ProductModal
          mode={modal.type}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </AdminPage>
  );
}

export function Pedidos() {
  const [orders, setOrders] = useState<AdminItem[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: `WC${Date.now() + i}`,
      nome: `Cliente ${i + 1}`,
      status: statuses[i % statuses.length],
      total: 120 + i * 35
    }))
  );
  const [modal, setModal] = useState<{ type: 'view' | 'edit'; item: AdminItem } | null>(null);

  function addOrder(order: AdminItem) {
    setOrders([{ ...order, id: `WC${uid()}` }, ...orders]);
  }

  function update(order: AdminItem) {
    setOrders(orders.map((o) => (o.id === order.id ? order : o)));
    setModal(null);
  }

  function receipt(order: AdminItem) {
    const text = `RECIBO - GRÁFICA W CRIAÇÕES\nPedido: ${order.id}\nCliente: ${order.nome}\nStatus: ${order.status}\nTotal: ${formatMoney(order.total || 0)}`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:Arial;font-size:18px;white-space:pre-wrap">${text}</pre><script>window.print()</script>`);
      win.document.close();
    }
  }

  return (
    <AdminPage title="Gerenciador de Pedidos">
      <ManualOrderForm onAdd={addOrder} />

      <h2 className="font-display text-2xl text-primary mt-8 mb-4">Pedidos registrados</h2>

      <Table
        heads={['Número', 'Cliente', 'Data', 'Status', 'Total', 'Ações']}
        rows={orders.map((o) => [
          o.id,
          o.nome,
          new Date().toLocaleDateString('pt-BR'),
          o.status,
          formatMoney(o.total || 0),
          <div className="admin-action-row">
            <button className="admin-action-btn" onClick={() => setModal({ type: 'view', item: o })}>Ver</button>
            <button className="admin-action-btn" onClick={() => setModal({ type: 'edit', item: o })}>Atualizar</button>
            <button className="admin-action-btn" onClick={() => receipt(o)}>Recibo</button>
          </div>
        ])}
      />

      {modal && (
        <OrderModal
          mode={modal.type}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={update}
        />
      )}
    </AdminPage>
  );
}

function ManualOrderForm({ onAdd }: { onAdd: (order: AdminItem) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [total, setTotal] = useState('');

  function save() {
    if (!nome.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    onAdd({
      id: '',
      nome,
      total: Number(total.replace(',', '.')) || 0,
      status: 'pendente'
    });

    setNome('');
    setTotal('');
    setOpen(false);
    alert('Pedido manual registrado.');
  }

  return (
    <div className="card p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-primary">Registrar pedido manualmente</h2>
          <p className="text-gray-600 mt-1">
            Use para controlar pedidos fechados no balcão, WhatsApp ou telefone.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setOpen(!open)}>
          {open ? 'Fechar' : 'Novo pedido manual'}
        </button>
      </div>

      {open && (
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <input className="input" placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="input" placeholder="Telefone" />
          <input className="input" placeholder="Email opcional" />
          <input className="input md:col-span-2" placeholder="Descrição do pedido" />
          <input className="input" placeholder="Total R$" value={total} onChange={(e) => setTotal(e.target.value)} />
          <select className="input">
            <option>pendente</option>
            <option>confirmado</option>
            <option>em_producao</option>
            <option>pronto</option>
            <option>entregue</option>
          </select>
          <select className="input">
            <option>Pagamento pendente</option>
            <option>Pagamento confirmado</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={save}>Salvar pedido manual</button>
        </div>
      )}
    </div>
  );
}

export function Clientes() {
  const [items, setItems] = useState<AdminItem[]>(
    Array.from({ length: 7 }, (_, i) => ({
      id: uid() + i,
      nome: `Cliente ${i + 1}`,
      email: `cliente${i + 1}@email.com`,
      telefone: '(88) 99624-0470',
      total: 450 + i * 120
    }))
  );
  const [modal, setModal] = useState<{ type: 'view' | 'edit'; item: AdminItem } | null>(null);

  function save(item: AdminItem) {
    setItems(items.map((c) => (c.id === item.id ? item : c)));
    setModal(null);
  }

  return (
    <AdminPage title="Gerenciador de Clientes">
      <Table
        heads={['Nome', 'Email', 'Telefone', 'Total gasto', 'Pedidos', 'Ações']}
        rows={items.map((c, i) => [
          c.nome,
          c.email,
          c.telefone,
          formatMoney(c.total || 0),
          i + 2,
          <div className="admin-action-row">
            <button className="admin-action-btn" onClick={() => setModal({ type: 'view', item: c })}>Ver</button>
            <button className="admin-action-btn" onClick={() => setModal({ type: 'edit', item: c })}>Editar</button>
          </div>
        ])}
      />

      {modal && (
        <ClientModal
          mode={modal.type}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </AdminPage>
  );
}

export function Categorias() {
  const [items, setItems] = useState<AdminItem[]>(
    mockCategories.map((c, i) => ({
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      status: 'Ativo',
      estoque: 12 + i
    }))
  );
  const [modal, setModal] = useState<{ type: 'new' | 'edit'; item?: AdminItem } | null>(null);

  function save(item: AdminItem) {
    if (modal?.type === 'new') {
      setItems([{ ...item, id: uid(), status: 'Ativo' }, ...items]);
    } else {
      setItems(items.map((c) => (c.id === item.id ? item : c)));
    }
    setModal(null);
  }

  function remove(item: AdminItem) {
    if (confirm(`Deseja deletar a categoria ${item.nome}?`)) {
      setItems(items.filter((c) => c.id !== item.id));
    }
  }

  return (
    <AdminPage title="Gerenciador de Categorias">
      <button className="btn btn-primary mb-5" onClick={() => setModal({ type: 'new' })}>
        Nova Categoria
      </button>

      <Table
        heads={['Nome', 'Slug', 'Produtos', 'Status', 'Ações']}
        rows={items.map((c) => [
          c.nome,
          c.slug,
          c.estoque,
          c.status,
          <Actions
            onView={() => setModal({ type: 'edit', item: c })}
            onEdit={() => setModal({ type: 'edit', item: c })}
            onDelete={() => remove(c)}
          />
        ])}
      />

      {modal && (
        <CategoryModal
          mode={modal.type}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </AdminPage>
  );
}

export function Cupons() {
  return (
    <AdminPage title="Gerenciador de Cupons">
      <button className="btn btn-primary mb-5" onClick={() => alert('Cadastro de cupom aberto.')}>Novo Cupom</button>
      <Table
        heads={['Código', 'Tipo', 'Valor', 'Uso', 'Datas', 'Status', 'Ações']}
        rows={['PRIMEIRA10', 'FRETE15', 'GRAFICA20'].map((c, i) => [
          c,
          i === 1 ? 'fixo' : 'percentual',
          i === 1 ? 'R$ 15' : '10%',
          '3/100',
          '01/01 até 31/12',
          'Ativo',
          <Actions onView={() => alert(c)} onEdit={() => alert('Editar cupom')} onDelete={() => alert('Desativar cupom')} />
        ])}
      />
    </AdminPage>
  );
}

export function Avaliacoes() {
  return (
    <AdminPage title="Gerenciador de Avaliações">
      <Table
        heads={['Produto', 'Cliente', 'Nota', 'Comentário', 'Verificado', 'Data', 'Ações']}
        rows={mockProducts.slice(0, 5).map((p, i) => [
          p.nome,
          'Cliente ' + (i + 1),
          '★★★★★',
          'Excelente qualidade',
          'Sim',
          new Date().toLocaleDateString('pt-BR'),
          <Actions onView={() => alert('Avaliação: Excelente qualidade')} onEdit={() => alert('Responder avaliação')} onDelete={() => alert('Avaliação removida')} />
        ])}
      />
    </AdminPage>
  );
}

export function Configuracoes() {
  const tabs = ['Informações Gerais', 'Sobre', 'Frete', 'Redes Sociais', 'Email', 'WhatsApp', 'Políticas'];
  const [active, setActive] = useState(tabs[0]);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('site_config_saved', new Date().toISOString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <AdminPage title="Configurações do Site">
      <div className="grid lg:grid-cols-4 gap-5 md:gap-6">
        <div className="card p-4 grid gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className={`text-left px-4 py-3 rounded-xl font-bold ${active === t ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <form className="card p-5 md:p-6 lg:col-span-3 grid md:grid-cols-2 gap-4" onSubmit={save}>
          <div className="md:col-span-2">
            <span className="badge bg-yellow-100 text-primary">{active}</span>
          </div>

          <input className="input" defaultValue="Gráfica W Criações" />
          <input className="input" defaultValue="contato@graficawcriacoes.com" />
          <input className="input" defaultValue="(88) 99624-0470" />
          <input className="input" defaultValue="5588996240470" />
          <textarea
            className="input md:col-span-2 min-h-32"
            defaultValue="Finalização de pedidos pelo WhatsApp, sem pagamento online. Recibo disponível após conclusão do pedido."
          />

          {saved && (
            <div className="md:col-span-2 rounded-xl bg-green-100 text-green-800 font-bold p-3">
              Configuração salva com sucesso.
            </div>
          )}

          <button type="submit" className="btn btn-primary md:col-span-2">
            Salvar configurações
          </button>
        </form>
      </div>
    </AdminPage>
  );
}

export function Contatos() {
  return (
    <AdminPage title="Gerenciador de Contatos">
      <Table
        heads={['Nome', 'Email', 'Telefone', 'Assunto', 'Data', 'Status', 'Ações']}
        rows={Array.from({ length: 6 }, (_, i) => [
          `Lead ${i + 1}`,
          `lead${i + 1}@email.com`,
          '(88) 99624-0470',
          'Orçamento',
          new Date().toLocaleDateString('pt-BR'),
          i % 2 ? 'Respondido' : 'Pendente',
          <Actions onView={() => alert('Mensagem de orçamento')} onEdit={() => alert('Responder contato')} onDelete={() => alert('Contato removido')} />
        ])}
      />
    </AdminPage>
  );
}

export function Relatorios() {
  return (
    <AdminPage title="Relatórios">
      <div className="grid md:grid-cols-2 gap-5 md:gap-6">
        <Panel title="Relatório de vendas" />
        <Panel title="Produtos mais vendidos" />
        <Panel title="Clientes recorrentes" />
        <Panel title="Frete" />
      </div>
      <button className="btn btn-primary mt-6" onClick={() => alert('Relatório exportado.')}>Exportar CSV/PDF</button>
    </AdminPage>
  );
}

export function Usuarios() {
  return (
    <AdminPage title="Gerenciador de Usuários">
      <Table
        heads={['Nome', 'Email', 'Role', 'Data cadastro', 'Ações']}
        rows={[
          ['Administrador', 'admin@graficawcriacoes.com', 'admin', new Date().toLocaleDateString('pt-BR'), <button className="admin-action-btn" onClick={() => alert('Editar administrador')}>Editar</button>],
          ['Cliente', 'cliente@email.com', 'user', new Date().toLocaleDateString('pt-BR'), <button className="admin-action-btn" onClick={() => alert('Editar cliente')}>Editar</button>]
        ]}
      />
    </AdminPage>
  );
}

function ProductModal({ mode, item, onClose, onSave }: { mode: 'view' | 'edit' | 'new'; item?: AdminItem; onClose: () => void; onSave: (item: AdminItem) => void }) {
  const [form, setForm] = useState<AdminItem>(
    item || { id: '', nome: '', categoria: '', preco: 0, estoque: 0, status: 'Ativo' }
  );
  const readOnly = mode === 'view';

  return (
    <Modal title={mode === 'new' ? 'Novo produto' : mode === 'edit' ? 'Editar produto' : 'Ver produto'} onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nome" value={form.nome} disabled={readOnly} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input className="input" placeholder="Categoria" value={form.categoria || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
        <input className="input" placeholder="Preço" value={form.preco || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} />
        <input className="input" placeholder="Estoque" value={form.estoque || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })} />
        <select className="input" value={form.status || 'Ativo'} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </div>
      <ModalActions readOnly={readOnly} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

function CategoryModal({ mode, item, onClose, onSave }: { mode: 'new' | 'edit'; item?: AdminItem; onClose: () => void; onSave: (item: AdminItem) => void }) {
  const [form, setForm] = useState<AdminItem>(item || { id: '', nome: '', slug: '', status: 'Ativo', estoque: 0 });

  return (
    <Modal title={mode === 'new' ? 'Nova categoria' : 'Editar categoria'} onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input className="input" placeholder="Slug" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="Quantidade de produtos" value={form.estoque || ''} onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })} />
        <select className="input" value={form.status || 'Ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </div>
      <ModalActions onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

function ClientModal({ mode, item, onClose, onSave }: { mode: 'view' | 'edit'; item: AdminItem; onClose: () => void; onSave: (item: AdminItem) => void }) {
  const [form, setForm] = useState<AdminItem>(item);
  const readOnly = mode === 'view';

  return (
    <Modal title={mode === 'view' ? 'Ver cliente' : 'Editar cliente'} onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <input className="input" placeholder="Nome" value={form.nome} disabled={readOnly} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input className="input" placeholder="Email" value={form.email || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Telefone" value={form.telefone || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <input className="input" placeholder="Total gasto" value={form.total || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
      </div>
      <ModalActions readOnly={readOnly} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

function OrderModal({ mode, item, onClose, onSave }: { mode: 'view' | 'edit'; item: AdminItem; onClose: () => void; onSave: (item: AdminItem) => void }) {
  const [form, setForm] = useState<AdminItem>(item);
  const readOnly = mode === 'view';

  return (
    <Modal title={mode === 'view' ? 'Ver pedido' : 'Atualizar pedido'} onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <input className="input" value={form.id} disabled />
        <input className="input" value={form.nome} disabled={readOnly} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <input className="input" value={form.total || ''} disabled={readOnly} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
        <select className="input" value={form.status || 'pendente'} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ModalActions readOnly={readOnly} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

function ModalActions({ readOnly, onClose, onSave }: { readOnly?: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-6">
      {!readOnly && <button className="btn btn-primary" onClick={onSave}>Salvar</button>}
      <button className="btn btn-outline" onClick={onClose}>Fechar</button>
    </div>
  );
}

function Actions({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="admin-action-row">
      <button className="admin-action-btn" onClick={onView}>Ver</button>
      <button className="admin-action-btn" onClick={onEdit}>Editar</button>
      <button className="admin-action-btn danger" onClick={onDelete}>Deletar</button>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-display text-2xl text-primary">{title}</h2>
          <button className="admin-action-btn" onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdminPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fade">
      <h1 className="font-display text-3xl md:text-4xl text-primary mb-5 md:mb-6">{title}</h1>
      {children}
    </div>
  );
}

function Panel({ title }: { title: string }) {
  return (
    <div className="card p-5 md:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="h-48 md:h-56 mt-5 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 grid place-items-center text-gray-500">
        Gráfico dinâmico
      </div>
    </div>
  );
}

function Table({ heads, rows }: { heads: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="card admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
