import { useEffect, useState, type FormEvent } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileUp,
  MessageSquareText,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Plus,
  ArrowLeft,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Paperclip,
  Pencil,
  AlertTriangle,
  Search,
  UserPlus,
  ShieldCheck,
  Timer,
  Play,
  Pause,
} from "lucide-react";
import { api, session } from "./api";
type User = { id: string; name: string; email: string; role: string };
type Campaign = {
  id: string;
  name: string;
  description?: string;
  status: string;
  messageTemplate?: string;
  defaultUrl?: string;
  attachmentName?: string;
  createdAt: string;
  _count?: { contacts: number };
  counts?: Record<string, number>;
};
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session.get()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/auth/me")
      .then((x) => setUser(x.user))
      .catch(() => session.clear())
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="splash">Carregando…</div>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell
      user={user}
      logout={() => {
        session.clear();
        setUser(null);
      }}
    />
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      session.set(result.token);
      onLogin(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-brand">
        <div className="brand-mark">W</div>
        <h1>WhatsSender Web</h1>
        <p>Campanhas personalizadas, operação humana e histórico confiável.</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">ACESSO SEGURO</span>
        <h2>Bem-vindo de volta</h2>
        <p>Entre para gerenciar suas campanhas.</p>
        <label>
          E-mail
          <input
            name="email"
            type="email"
            required
            autoFocus
            placeholder="voce@empresa.com"
          />
        </label>
        <label>
          Senha
          <input name="password" type="password" required minLength={8} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
const menus = [
  [LayoutDashboard, "Dashboard", "/"],
  [Megaphone, "Campanhas", "/campanhas"],
  [Users, "Contatos", "/contatos"],
  [FileUp, "Importações", "/importacoes"],
  [MessageSquareText, "Modelos", "/modelos"],
  [Timer, "Envios", "/envios"],
  [BarChart3, "Relatórios", "/relatorios"],
  [Settings, "Configurações", "/configuracoes"],
] as const;
function Shell({ user, logout }: { user: User; logout: () => void }) {
  return (
    <div className="shell">
      <aside>
        <div className="logo">
          <div className="brand-mark">W</div>
          <span>WhatsSender</span>
        </div>
        <nav>
          {menus.map(([Icon, label, to]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>
      <div className="main">
        <header>
          <div>
            <span className="muted">Espaço de trabalho</span>
            <strong>Operação comercial</strong>
          </div>
          <div className="profile">
            <button className="icon">
              <Bell size={19} />
            </button>
            <div className="avatar">{user.name[0]}</div>
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.role === "ADMIN" ? "Administrador" : "Operador"}
              </span>
            </div>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campanhas" element={<Campaigns />} />
          <Route path="/importacoes" element={<Imports />} />
          <Route path="/modelos" element={<Models />} />
          <Route path="/envios" element={<SendSetup />} />
          <Route path="/contatos" element={<Contacts />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route
            path="/configuracoes"
            element={<SettingsUsers currentUser={user} />}
          />
          <Route path="/campanhas/:id" element={<CampaignDetail />} />
          <Route path="/campanhas/:id/fila" element={<Queue />} />
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </div>
    </div>
  );
}
function Dashboard() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    api("/dashboard").then(setData);
  }, []);
  if (!data)
    return (
      <Page title="Dashboard">
        <div className="skeleton" />
      </Page>
    );
  const cards = [
    ["Campanhas", data.campaigns, "neutral"],
    ["Contatos", data.contacts, "neutral"],
    ["Aguardando", data.statuses.PENDING ?? 0, "warning"],
    ["Enviados", data.statuses.SENT ?? 0, "success"],
    ["Sem WhatsApp", data.statuses.NO_WHATSAPP ?? 0, "danger"],
    ["Erros", data.statuses.ERROR ?? 0, "danger"],
  ];
  return (
    <Page title="Dashboard" subtitle="Visão geral da sua operação">
      <div className="metrics">
        {cards.map(([label, value, tone]) => (
          <div className={`metric ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-title">
            <h3>Campanhas recentes</h3>
            <NavLink to="/campanhas">Ver todas</NavLink>
          </div>
          {data.recent.length ? (
            data.recent.map((c: Campaign) => (
              <NavLink
                className="campaign-row"
                to={`/campanhas/${c.id}`}
                key={c.id}
              >
                <div>
                  <strong>{c.name}</strong>
                  <span>{c._count?.contacts ?? 0} contatos</span>
                </div>
                <span className="badge">{statusLabel(c.status)}</span>
              </NavLink>
            ))
          ) : (
            <Empty text="Nenhuma campanha criada" />
          )}
        </section>
        <section className="panel">
          <h3>Ritmo de envio</h3>
          <div className="big-stat">
            <strong>{data.sentToday}</strong>
            <span>enviados hoje</span>
          </div>
          <div className="week-stat">
            <span>Últimos 7 dias</span>
            <strong>{data.sentWeek}</strong>
          </div>
          <p className="hint">
            Os resultados são confirmados manualmente pelo operador e
            preservados no histórico.
          </p>
        </section>
      </div>
    </Page>
  );
}
function Campaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Campaign>();
  const load = () =>
    api<{ items: Campaign[] }>("/campaigns").then((x) => setItems(x.items));
  useEffect(() => {
    void load();
  }, []);
  async function saveCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api(editing ? `/campaigns/${editing.id}` : "/campaigns", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify({
        name: f.get("name"),
        description: f.get("description"),
        status: f.get("status"),
        defaultUrl: f.get("defaultUrl"),
        messageTemplate: f.get("messageTemplate"),
      }),
    });
    setEditing(undefined);
    await load();
  }
  async function deleteCampaign(campaign: Campaign) {
    await api(`/campaigns/${campaign.id}`, { method: "DELETE" });
    await load();
  }
  return (
    <Page
      title="Campanhas"
      subtitle="Planeje, importe e acompanhe cada operação"
      action={
        <button className="primary inline" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Nova campanha
        </button>
      }
    >
      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Status</th>
              <th>Contatos</th>
              <th>Criada em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <span>{c.description || "Sem descrição"}</span>
                </td>
                <td>
                  <span className={`badge ${c.status.toLowerCase()}`}>
                    {statusLabel(c.status)}
                  </span>
                </td>
                <td>{c._count?.contacts ?? 0}</td>
                <td>{date(c.createdAt)}</td>
                <td>
                  <div className="table-actions">
                    <NavLink className="link" to={`/campanhas/${c.id}`}>
                      Abrir
                    </NavLink>
                    <button
                      className="icon"
                      onClick={() => setEditing(c)}
                      title="Editar campanha"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="danger-icon"
                      onClick={() => setPendingDelete(c)}
                      title="Excluir campanha"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty text="Crie sua primeira campanha para começar" />
        )}
      </section>
      {editing !== undefined && (
        <Modal
          title={editing ? "Editar campanha" : "Nova campanha"}
          close={() => setEditing(undefined)}
        >
          <form onSubmit={saveCampaign} className="stack">
            <label>
              Nome
              <input
                name="name"
                required
                minLength={2}
                placeholder="Clientes Agosto"
                defaultValue={editing?.name}
              />
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                rows={3}
                defaultValue={editing?.description}
              />
            </label>
            <div className="form-grid">
              <label>
                Status
                <select name="status" defaultValue={editing?.status ?? "DRAFT"}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="PAUSED">Pausada</option>
                  <option value="FINISHED">Finalizada</option>
                  <option value="ARCHIVED">Arquivada</option>
                </select>
              </label>
              <label>
                URL padrão
                <input
                  name="defaultUrl"
                  type="url"
                  defaultValue={editing?.defaultUrl}
                />
              </label>
            </div>
            <label>
              Mensagem
              <textarea
                name="messageTemplate"
                rows={7}
                defaultValue={editing?.messageTemplate}
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary">
                {editing ? "Salvar alterações" : "Criar campanha"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Excluir campanha?"
          description={`A campanha “${pendingDelete.name}”, suas importações, vínculos e eventos serão removidos. Os contatos do cadastro geral serão preservados.`}
          confirmLabel="Excluir campanha"
          close={() => setPendingDelete(undefined)}
          onConfirm={() => deleteCampaign(pendingDelete)}
        />
      )}
    </Page>
  );
}
type ContactItem = {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  customFields: Record<string, unknown>;
  whatsappStatus: string;
  sentCount: number;
  campaignCount: number;
  imports: Array<{
    import: {
      id: string;
      fileName: string;
      campaign: { id: string; name: string };
    };
  }>;
};
function Contacts() {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [total, setTotal] = useState(0);
  const [overallTotal, setOverallTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ContactItem>();
  const pageSize = 20;
  const load = async (currentPage = page, currentSearch = search) => {
    const result = await api<{
      items: ContactItem[];
      total: number;
      overallTotal: number;
    }>(
      `/contacts?page=${currentPage}&pageSize=${pageSize}&search=${encodeURIComponent(currentSearch)}`,
    );
    setItems(result.items);
    setTotal(result.total);
    setOverallTotal(result.overallTotal);
  };
  useEffect(() => {
    void load();
  }, [page]);
  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    await load(1, search);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    await api(`/contacts/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        city: form.get("city"),
        state: form.get("state"),
        notes: form.get("notes"),
        customFields: {
          ...editing.customFields,
          cargo: form.get("cargo"),
          obs: form.get("obs"),
        },
      }),
    });
    setEditing(undefined);
    await load();
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Page
      title="Contatos"
      subtitle="Cadastro consolidado dos contatos importados"
    >
      <div className="contacts-toolbar">
        <div className="contact-total">
          <Users size={22} />
          <div>
            <strong>{overallTotal}</strong>
            <span>contatos cadastrados</span>
          </div>
        </div>
        <form className="search-box" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail"
          />
          <button className="primary">Buscar</button>
        </form>
      </div>
      <section className="panel table-panel contacts-table">
        <table>
          <thead>
            <tr>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Tags de importação</th>
              <th>Campanhas</th>
              <th>Envios realizados</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <strong>{contact.name || "Sem nome"}</strong>
                  <span>{contact.email || "Sem e-mail"}</span>
                </td>
                <td>{contact.phone}</td>
                <td>
                  {[contact.city, contact.state].filter(Boolean).join(" / ") ||
                    "—"}
                </td>
                <td>
                  <div className="import-tags">
                    {contact.imports.map(({ import: item }) => (
                      <span
                        key={item.id}
                        title={`${item.fileName} • ${item.campaign.name}`}
                      >
                        {item.fileName}
                      </span>
                    ))}
                    {!contact.imports.length && (
                      <span className="tag-empty">Cadastro manual</span>
                    )}
                  </div>
                </td>
                <td>{contact.campaignCount}</td>
                <td>
                  <strong className="sent-count">{contact.sentCount}</strong>
                </td>
                <td>
                  <button
                    className="icon"
                    onClick={() => setEditing(contact)}
                    title="Editar contato"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <Empty text="Nenhum contato encontrado" />}
      </section>
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={17} /> Anterior
        </button>
        <span>
          Página {page} de {pages} · {total} resultados
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Próxima <ChevronRight size={17} />
        </button>
      </div>
      {editing && (
        <Modal title="Editar contato" close={() => setEditing(undefined)}>
          <form className="stack" onSubmit={save}>
            <div className="form-grid">
              <label>
                Nome
                <input name="name" defaultValue={editing.name} />
              </label>
              <label>
                Telefone
                <input name="phone" required defaultValue={editing.phone} />
              </label>
              <label>
                E-mail
                <input name="email" type="email" defaultValue={editing.email} />
              </label>
              <label>
                Cidade
                <input name="city" defaultValue={editing.city} />
              </label>
              <label>
                Estado
                <input
                  name="state"
                  maxLength={2}
                  defaultValue={editing.state}
                />
              </label>
              <label>
                Cargo
                <input
                  name="cargo"
                  defaultValue={String(editing.customFields?.cargo ?? "")}
                />
              </label>
            </div>
            <label>
              Observação importada
              <input
                name="obs"
                defaultValue={String(editing.customFields?.obs ?? "")}
              />
            </label>
            <label>
              Observações internas
              <textarea name="notes" rows={4} defaultValue={editing.notes} />
            </label>
            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary">Salvar contato</button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}
type ReportData = {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    total: number;
    sent: number;
    pending: number;
    noWhatsapp: number;
    errors: number;
    skipped: number;
    percentage: number;
  }>;
  users: Array<{
    id: string;
    name: string;
    role: string;
    campaigns: number;
    sent: number;
    lastActivity?: string;
  }>;
  daily: Array<{ date: string; sent: number }>;
};
function Reports() {
  const [data, setData] = useState<ReportData>();
  useEffect(() => {
    api<ReportData>("/reports/summary").then(setData);
  }, []);
  if (!data)
    return (
      <Page title="Relatórios">
        <div className="skeleton" />
      </Page>
    );
  const totalSent = data.campaigns.reduce((sum, item) => sum + item.sent, 0);
  const totalContacts = data.campaigns.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const maxDaily = Math.max(1, ...data.daily.map((item) => item.sent));
  return (
    <Page
      title="Relatórios"
      subtitle="Resultados calculados a partir do histórico de eventos"
    >
      <div className="metrics compact report-metrics">
        <div className="metric">
          <span>Campanhas</span>
          <strong>{data.campaigns.length}</strong>
        </div>
        <div className="metric">
          <span>Participações</span>
          <strong>{totalContacts}</strong>
        </div>
        <div className="metric success">
          <span>Envios</span>
          <strong>{totalSent}</strong>
        </div>
        <div className="metric">
          <span>Operadores</span>
          <strong>{data.users.length}</strong>
        </div>
      </div>
      <div className="grid-2 reports-top">
        <section className="panel">
          <h3>Envios nos últimos 30 dias</h3>
          <div className="daily-chart">
            {data.daily.length ? (
              data.daily.map((item) => (
                <div
                  className="daily-column"
                  key={item.date}
                  title={`${date(item.date)}: ${item.sent} envios`}
                >
                  <span>{item.sent}</span>
                  <div
                    style={{
                      height: `${Math.max(8, (item.sent / maxDaily) * 120)}px`,
                    }}
                  />
                  <small>
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(item.date))}
                  </small>
                </div>
              ))
            ) : (
              <Empty text="Nenhum envio registrado no período" />
            )}
          </div>
        </section>
        <section className="panel">
          <h3>Desempenho por usuário</h3>
          {data.users.map((user) => (
            <div className="user-report" key={user.id}>
              <div className="avatar">{user.name[0]}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.campaigns} campanhas</span>
              </div>
              <strong>{user.sent} envios</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="panel table-panel report-table">
        <div className="section-padding">
          <h3>Resultados por campanha</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Total</th>
              <th>Enviados</th>
              <th>Pendentes</th>
              <th>Sem WhatsApp</th>
              <th>Erros</th>
              <th>Conclusão</th>
            </tr>
          </thead>
          <tbody>
            {data.campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>
                  <strong>{campaign.name}</strong>
                  <span>{statusLabel(campaign.status)}</span>
                </td>
                <td>{campaign.total}</td>
                <td>{campaign.sent}</td>
                <td>{campaign.pending}</td>
                <td>{campaign.noWhatsapp}</td>
                <td>{campaign.errors}</td>
                <td>
                  <strong>{campaign.percentage}%</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  active: boolean;
  createdAt: string;
  _count: { campaigns: number; events: number };
};
function SettingsUsers({ currentUser }: { currentUser: User }) {
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = () =>
    api<{ items: ManagedUser[] }>("/users").then((result) =>
      setItems(result.items),
    );
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(editing ? `/users/${editing.id}` : "/users", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          role: form.get("role"),
          active:
            editing?.id === currentUser.id ? true : form.get("active") === "on",
          password: form.get("password"),
        }),
      });
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o usuário",
      );
    } finally {
      setBusy(false);
    }
  }
  const activeUsers = items.filter((item) => item.active).length;
  const admins = items.filter(
    (item) => item.role === "ADMIN" && item.active,
  ).length;
  return (
    <Page
      title="Configurações"
      subtitle="Criação e gerenciamento dos usuários do sistema"
      action={
        currentUser.role === "ADMIN" ? (
          <button
            className="primary inline"
            onClick={() => {
              setError("");
              setEditing(null);
            }}
          >
            <UserPlus size={18} /> Novo usuário
          </button>
        ) : undefined
      }
    >
      <div className="settings-tabs">
        <button className="active">
          <Users size={17} /> Usuários
        </button>
      </div>
      <div className="metrics user-metrics">
        <div className="metric">
          <span>Total de usuários</span>
          <strong>{items.length}</strong>
        </div>
        <div className="metric success">
          <span>Usuários ativos</span>
          <strong>{activeUsers}</strong>
        </div>
        <div className="metric">
          <span>Administradores</span>
          <strong>{admins}</strong>
        </div>
      </div>
      <section className="panel table-panel users-table">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Campanhas</th>
              <th>Envios registrados</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>
                    {item.name}
                    {item.id === currentUser.id ? " (você)" : ""}
                  </strong>
                  <span>{item.email}</span>
                </td>
                <td>
                  <span className="role-label">
                    <ShieldCheck size={14} />
                    {item.role === "ADMIN" ? "Administrador" : "Operador"}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${item.active ? "active" : "archived"}`}
                  >
                    {item.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>{item._count.campaigns}</td>
                <td>{item._count.events}</td>
                <td>{date(item.createdAt)}</td>
                <td>
                  <button
                    className="icon"
                    onClick={() => {
                      setError("");
                      setEditing(item);
                    }}
                    title="Editar usuário"
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {editing !== undefined && (
        <Modal
          title={editing ? "Editar usuário" : "Novo usuário"}
          close={() => setEditing(undefined)}
        >
          <form className="stack" onSubmit={save}>
            <div className="form-grid">
              <label>
                Nome
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editing?.email}
                />
              </label>
              <label>
                Perfil
                <select name="role" defaultValue={editing?.role ?? "OPERATOR"}>
                  <option value="OPERATOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              <label>
                {editing ? "Nova senha (opcional)" : "Senha"}
                <input
                  name="password"
                  type="password"
                  required={!editing}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing?.active ?? true}
                disabled={editing?.id === currentUser.id}
              />
              Usuário ativo e autorizado a entrar no sistema
            </label>
            {editing?.id === currentUser.id && (
              <p className="hint">
                Sua própria conta não pode ser desativada nem perder o perfil
                administrativo.
              </p>
            )}
            {error && <div className="error">{error}</div>}
            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar usuário"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}
type MessageModel = {
  id: string;
  name: string;
  category?: string;
  message: string;
  variables: string[];
  defaultUrl?: string;
  attachmentName?: string;
  updatedAt: string;
};
function Models() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MessageModel[]>([]);
  const [editing, setEditing] = useState<MessageModel | null | undefined>();
  const [campaignSource, setCampaignSource] = useState<MessageModel>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MessageModel>();
  const variables = [
    "nome",
    "email",
    "telefone",
    "cargo",
    "cidade",
    "obs",
    "url",
  ];
  const load = () =>
    api<{ items: MessageModel[] }>("/templates?pageSize=100").then((result) =>
      setItems(result.items),
    );
  useEffect(() => {
    void load();
  }, []);
  function openForm(item?: MessageModel) {
    setEditing(item ?? null);
    setMessage(item?.message ?? "");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    form.set("message", message);
    try {
      await api(editing ? `/templates/${editing.id}` : "/templates", {
        method: editing ? "PATCH" : "POST",
        body: form,
      });
      setEditing(undefined);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: MessageModel) {
    await api(`/templates/${item.id}`, { method: "DELETE" });
    await load();
  }
  async function downloadAttachment(item: MessageModel) {
    const response = await fetch(`/api/templates/${item.id}/attachment`, {
      headers: { Authorization: `Bearer ${session.get()}` },
    });
    if (!response.ok) throw new Error("Não foi possível baixar o anexo");
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = item.attachmentName || "anexo";
    anchor.click();
    URL.revokeObjectURL(href);
  }
  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaignSource) return;
    const form = new FormData(event.currentTarget);
    const campaign = await api<Campaign>(
      `/templates/${campaignSource.id}/campaign`,
      {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
        }),
      },
    );
    navigate(`/campanhas/${campaign.id}`);
  }
  return (
    <Page
      title="Modelos de mensagem"
      subtitle="Crie mensagens reutilizáveis e inicie campanhas já configuradas"
      action={
        <button className="primary inline" onClick={() => openForm()}>
          <Plus size={18} /> Novo modelo
        </button>
      }
    >
      <div className="model-grid">
        {items.map((item) => (
          <section className="panel model-card" key={item.id}>
            <div className="panel-title">
              <div>
                <span className="eyebrow">{item.category || "GERAL"}</span>
                <h3>{item.name}</h3>
              </div>
              <button
                className="icon"
                onClick={() => openForm(item)}
                title="Editar"
              >
                <Pencil size={16} />
              </button>
            </div>
            <pre className="model-message">{item.message}</pre>
            <div className="model-variables">
              {item.variables.map((variable) => (
                <span key={variable}>{`{{${variable}}}`}</span>
              ))}
            </div>
            {item.defaultUrl && <p className="model-url">{item.defaultUrl}</p>}
            {item.attachmentName && (
              <button
                className="attachment-link"
                onClick={() => downloadAttachment(item)}
              >
                <Paperclip size={15} /> {item.attachmentName}
              </button>
            )}
            <div className="model-actions">
              <button
                className="primary"
                onClick={() => setCampaignSource(item)}
              >
                Criar campanha
              </button>
              <button
                className="danger-link"
                onClick={() => setPendingDelete(item)}
              >
                <Trash2 size={15} /> Excluir
              </button>
            </div>
          </section>
        ))}
      </div>
      {!items.length && <Empty text="Crie seu primeiro modelo de mensagem" />}
      {editing !== undefined && (
        <Modal
          title={editing ? "Editar modelo" : "Novo modelo"}
          close={() => setEditing(undefined)}
        >
          <form className="stack" onSubmit={save}>
            <div className="form-grid">
              <label>
                Nome do modelo
                <input name="name" required defaultValue={editing?.name} />
              </label>
              <label>
                Categoria
                <input
                  name="category"
                  defaultValue={editing?.category}
                  placeholder="Renovação"
                />
              </label>
            </div>
            <label>
              Mensagem
              <textarea
                name="message"
                rows={10}
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <div className="variable-list">
              <span>Inserir variável</span>
              <div>
                {variables.map((variable) => (
                  <button
                    type="button"
                    key={variable}
                    onClick={() =>
                      setMessage((value) => `${value}{{${variable}}}`)
                    }
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
            </div>
            <label>
              URL
              <input
                name="defaultUrl"
                type="url"
                defaultValue={editing?.defaultUrl}
                placeholder="https://site.com.br/oferta"
              />
            </label>
            <label>
              Anexo (máximo 10 MB)
              <input name="attachment" type="file" />
            </label>
            {editing?.attachmentName && (
              <label className="checkbox-label">
                <input name="removeAttachment" type="checkbox" value="true" />
                Remover anexo atual: {editing.attachmentName}
              </label>
            )}
            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar modelo"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {campaignSource && (
        <Modal
          title="Criar campanha a partir do modelo"
          close={() => setCampaignSource(undefined)}
        >
          <form className="stack" onSubmit={createCampaign}>
            <p className="hint">
              A mensagem, URL e anexo de <strong>{campaignSource.name}</strong>{" "}
              serão copiados para a campanha.
            </p>
            <label>
              Nome da campanha
              <input name="name" required minLength={2} autoFocus />
            </label>
            <label>
              Descrição
              <textarea name="description" rows={3} />
            </label>
            <div className="actions">
              <button className="primary">Criar e abrir campanha</button>
            </div>
          </form>
        </Modal>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Excluir modelo?"
          description={`O modelo “${pendingDelete.name}” será excluído. Campanhas já criadas a partir dele não serão alteradas.`}
          confirmLabel="Excluir modelo"
          close={() => setPendingDelete(undefined)}
          onConfirm={() => remove(pendingDelete)}
        />
      )}
    </Page>
  );
}
function CampaignDetail() {
  const { id } = useParams();
  const [c, setC] = useState<Campaign>();
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [variables, setVariables] = useState<string[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const load = () => api<Campaign>(`/campaigns/${id}`).then(setC);
  useEffect(() => {
    void load();
  }, [id]);
  if (!c)
    return (
      <Page title="Campanha">
        <div className="skeleton" />
      </Page>
    );
  const total = c._count?.contacts ?? 0,
    sent = c.counts?.SENT ?? 0;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: f.get("name"),
        description: f.get("description"),
        messageTemplate: messageDraft,
        defaultUrl: f.get("url"),
        status: f.get("status"),
      }),
    });
    setEditing(false);
    load();
  }
  async function openEditor() {
    const result = await api<{ variables: string[] }>(
      `/campaigns/${id}/variables`,
    );
    setVariables(result.variables);
    setMessageDraft(c?.messageTemplate ?? "");
    setEditing(true);
  }
  async function downloadCampaignAttachment() {
    const response = await fetch(`/api/campaigns/${id}/attachment`, {
      headers: { Authorization: `Bearer ${session.get()}` },
    });
    if (!response.ok) throw new Error("Não foi possível baixar o anexo");
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = c?.attachmentName || "anexo";
    anchor.click();
    URL.revokeObjectURL(href);
  }
  return (
    <Page
      title={c.name}
      subtitle={`Criada em ${date(c.createdAt)}`}
      back="/campanhas"
      action={
        <NavLink className="primary inline" to={`/campanhas/${id}/fila`}>
          Iniciar envio <ExternalLink size={17} />
        </NavLink>
      }
    >
      <div className="metrics compact">
        {[
          ["Total", total],
          ["Enviados", sent],
          ["Pendentes", c.counts?.PENDING ?? 0],
          ["Sem WhatsApp", c.counts?.NO_WHATSAPP ?? 0],
          ["Erros", c.counts?.ERROR ?? 0],
        ].map(([x, y]) => (
          <div className="metric" key={x}>
            <span>{x}</span>
            <strong>{y}</strong>
          </div>
        ))}
      </div>
      <div className="progress">
        <div style={{ width: `${total ? (sent / total) * 100 : 0}%` }} />
        <span>{total ? Math.round((sent / total) * 100) : 0}% concluído</span>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-title">
            <h3>Mensagem da campanha</h3>
            <button className="link" onClick={openEditor}>
              Editar
            </button>
          </div>
          <pre className="message">
            {c.messageTemplate || "Nenhuma mensagem configurada."}
          </pre>
          <div className="url">
            <span>URL padrão</span>
            <strong>{c.defaultUrl || "Não definida"}</strong>
          </div>
          {c.attachmentName && (
            <button
              className="attachment-link"
              onClick={downloadCampaignAttachment}
            >
              <Paperclip size={15} /> {c.attachmentName}
            </button>
          )}
        </section>
        <section className="panel">
          <h3>Próximo passo</h3>
          <p className="hint">
            Importe uma planilha CSV ou XLSX. Você poderá mapear as colunas
            antes de confirmar.
          </p>
          <button
            className="secondary inline"
            onClick={() => setImporting(true)}
          >
            <FileUp size={18} />
            Importar contatos
          </button>
        </section>
      </div>
      {editing && (
        <Modal title="Mensagem e campanha" close={() => setEditing(false)}>
          <form onSubmit={save} className="stack">
            <label>
              Nome da campanha
              <input name="name" required minLength={2} defaultValue={c.name} />
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                rows={3}
                defaultValue={c.description}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={c.status}>
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
                <option value="FINISHED">Finalizada</option>
              </select>
            </label>
            <label>
              URL padrão
              <input name="url" type="url" defaultValue={c.defaultUrl} />
            </label>
            <label>
              Mensagem
              <textarea
                name="message"
                rows={10}
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
              />
            </label>
            <div className="variable-list">
              <span>Variáveis disponíveis</span>
              <div>
                {variables.map((variable) => (
                  <button
                    type="button"
                    key={variable}
                    onClick={() =>
                      setMessageDraft((value) => `${value}{{${variable}}}`)
                    }
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
            </div>
            <span className="hint">
              Use variáveis como {"{{nome}}"} e fallback como{" "}
              {"{{nome|cliente}}"}.
            </span>
            <div className="actions">
              <button className="primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
      {importing && (
        <ImportWizard
          campaignId={id!}
          close={() => {
            setImporting(false);
            load();
          }}
        />
      )}
    </Page>
  );
}
function Imports() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState<
    Array<{
      id: string;
      fileName: string;
      status: string;
      createdAt: string;
      summary: Record<string, number>;
      campaign: { id: string; name: string };
    }>
  >([]);
  const [deletingId, setDeletingId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<(typeof items)[number]>();
  const load = async () => {
    const [campaignResult, importResult] = await Promise.all([
      api<{ items: Campaign[] }>("/campaigns?pageSize=100"),
      api<{ items: typeof items }>("/imports?pageSize=20"),
    ]);
    setCampaigns(campaignResult.items);
    setItems(importResult.items);
    setCampaignId((current) => current || campaignResult.items[0]?.id || "");
  };
  useEffect(() => {
    void load();
  }, []);
  async function downloadTemplate() {
    const response = await fetch("/api/imports/template", {
      headers: { Authorization: `Bearer ${session.get()}` },
    });
    if (!response.ok) throw new Error("Não foi possível baixar o modelo");
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "modelo-contatos-whatssender.xlsx";
    anchor.click();
    URL.revokeObjectURL(href);
  }
  async function deleteImport(item: (typeof items)[number]) {
    setDeletingId(item.id);
    try {
      await api(`/imports/${item.id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingId(undefined);
    }
  }
  return (
    <Page
      title="Importações"
      subtitle="Baixe o modelo, preencha os contatos e importe para uma campanha"
      action={
        <button className="secondary inline" onClick={downloadTemplate}>
          <FileUp size={18} /> Baixar planilha modelo
        </button>
      }
    >
      <div className="grid-2 import-start">
        <section className="panel">
          <span className="eyebrow">ETAPA 1</span>
          <h3>Baixe e preencha o modelo</h3>
          <p className="hint">
            A planilha contém: nome, email, telefone, cargo, cidade e obs. Não
            altere o nome da coluna telefone.
          </p>
          <button className="secondary inline" onClick={downloadTemplate}>
            Baixar modelo XLSX
          </button>
        </section>
        <section className="panel">
          <span className="eyebrow">ETAPA 2</span>
          <h3>Importe os contatos preenchidos</h3>
          <label>
            Campanha de destino
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary inline import-button"
            disabled={!campaignId}
            onClick={() => setImporting(true)}
          >
            <FileUp size={18} /> Selecionar planilha preenchida
          </button>
          {!campaigns.length && (
            <p className="hint">Crie uma campanha antes de importar.</p>
          )}
        </section>
      </div>
      <section className="panel table-panel imports-history">
        <div className="section-padding">
          <h3>Histórico de importações</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Campanha</th>
              <th>Status</th>
              <th>Importados</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.fileName}</strong>
                </td>
                <td>{item.campaign.name}</td>
                <td>
                  <span className="badge">{item.status}</span>
                </td>
                <td>{item.summary?.imported ?? "—"}</td>
                <td>{date(item.createdAt)}</td>
                <td>
                  <button
                    className="danger-link"
                    disabled={deletingId === item.id}
                    onClick={() => setPendingDelete(item)}
                    title="Excluir registro da importação"
                  >
                    <Trash2 size={16} />
                    {deletingId === item.id ? "Excluindo…" : "Excluir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <Empty text="Nenhuma planilha importada" />}
      </section>
      {importing && (
        <ImportWizard
          campaignId={campaignId}
          close={() => {
            setImporting(false);
            void load();
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Excluir importação?"
          description={`O registro “${pendingDelete.fileName}” e suas linhas de processamento serão removidos. Os contatos importados e seus históricos serão preservados.`}
          confirmLabel="Excluir importação"
          close={() => setPendingDelete(undefined)}
          onConfirm={() => deleteImport(pendingDelete)}
        />
      )}
    </Page>
  );
}
function ImportWizard({
  campaignId,
  close,
}: {
  campaignId: string;
  close: () => void;
}) {
  const [preview, setPreview] = useState<any>();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<any>();
  const [busy, setBusy] = useState(false);
  const variableName = (header: string) =>
    header
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const payload = () => {
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const custom = Object.fromEntries(
      (preview?.headers ?? [])
        .filter((header: string) => !mapped.has(header))
        .map((header: string) => [variableName(header), header])
        .filter(([variable]: string[]) => Boolean(variable)),
    );
    return {
      ...mapping,
      custom,
      ignoreInvalid: true,
      duplicateAction: "LINK",
    };
  };
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("campaignId", campaignId);
    try {
      const result = await api<any>("/imports/preview", {
        method: "POST",
        body: form,
      });
      setPreview(result);
      const guess = (names: string[]) =>
        result.headers.find((h: string) =>
          names.some((n) => h.toLowerCase().includes(n)),
        ) || "";
      setMapping({
        phone: guess(["telefone", "celular", "whatsapp", "fone"]),
        name: guess(["nome", "cliente"]),
        email: guess(["email"]),
        city: guess(["cidade"]),
        state: guess(["estado", "uf"]),
        url: guess(["url", "link"]),
      });
    } finally {
      setBusy(false);
    }
  }
  async function validate() {
    const result = await api<any>(`/imports/${preview.id}/validate`, {
      method: "POST",
      body: JSON.stringify({
        ...payload(),
      }),
    });
    setValidation(result);
  }
  async function confirm() {
    setBusy(true);
    await api(`/imports/${preview.id}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        ...payload(),
      }),
    });
    close();
  }
  return (
    <Modal title="Importar contatos" close={close}>
      {!preview ? (
        <form className="upload" onSubmit={upload}>
          <FileUp size={38} />
          <h3>Selecione sua planilha</h3>
          <p>CSV ou XLSX, até 100.000 linhas e 20 MB.</p>
          <input name="file" type="file" accept=".csv,.xlsx" required />
          <button className="primary" disabled={busy}>
            {busy ? "Lendo…" : "Ler planilha"}
          </button>
        </form>
      ) : (
        <div className="stack">
          <div className="steps">
            <strong>Mapear campos</strong>
            <span>{preview.totalRows} linhas encontradas</span>
          </div>
          {["phone", "name", "email", "city", "state", "url"].map((field) => (
            <label key={field}>
              {
                (
                  {
                    phone: "Telefone *",
                    name: "Nome",
                    email: "E-mail",
                    city: "Cidade",
                    state: "Estado",
                    url: "URL",
                  } as any
                )[field]
              }
              <select
                value={mapping[field] || ""}
                onChange={(e) =>
                  setMapping({ ...mapping, [field]: e.target.value })
                }
              >
                <option value="">Não mapear</option>
                {preview.headers.map((h: string) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          ))}
          {validation && (
            <div className="validation">
              <span>
                <strong>{validation.valid}</strong> válidos
              </span>
              <span>
                <strong>{validation.duplicatesInFile}</strong> duplicados
              </span>
              <span>
                <strong>{validation.invalid}</strong> inválidos
              </span>
              <span>
                <strong>{validation.missing}</strong> sem telefone
              </span>
            </div>
          )}
          <p className="hint">
            Colunas adicionais serão armazenadas automaticamente como variáveis
            personalizadas, por exemplo {"{{cargo}}"} e {"{{obs}}"}.
          </p>
          <div className="actions">
            {!validation ? (
              <button
                className="primary"
                disabled={!mapping.phone}
                onClick={validate}
              >
                Validar dados
              </button>
            ) : (
              <button className="primary" disabled={busy} onClick={confirm}>
                Importar {validation.importable} contatos
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
type QueueItem = {
  id: string;
  status: string;
  contact: { id: string; name?: string; phone: string; city?: string };
  generatedMessage?: string;
  whatsappUrl?: string;
};
type SendConfig = { minSeconds: number; maxSeconds: number };
function SendSetup() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageModel[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      api<{ items: Campaign[] }>("/campaigns?pageSize=100"),
      api<{ items: MessageModel[] }>("/templates?pageSize=100"),
    ]).then(([campaignResult, templateResult]) => {
      setCampaigns(campaignResult.items);
      setTemplates(templateResult.items);
    });
  }, []);
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minSeconds = Number(form.get("minSeconds"));
    const maxSeconds = Number(form.get("maxSeconds"));
    if (maxSeconds < minSeconds) {
      setError("O intervalo máximo deve ser maior ou igual ao mínimo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/campaigns/${campaignId}/apply-template`, {
        method: "POST",
        body: JSON.stringify({ templateId }),
      });
      localStorage.setItem(
        `send-config:${campaignId}`,
        JSON.stringify({ minSeconds, maxSeconds }),
      );
      navigate(`/campanhas/${campaignId}/fila`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a fila");
      setBusy(false);
    }
  }
  const selected = campaigns.find((item) => item.id === campaignId);
  const hasActiveQueue = campaignId && localStorage.getItem(`send-config:${campaignId}`);
  return (
    <Page title="Envios assistidos" subtitle="Prepare a lista, o modelo e o ritmo de atendimento">
      <div className="send-setup-grid">
        <form className="panel stack" onSubmit={start}>
          <div className="setup-step"><span>1</span><div><strong>Campanha e contatos</strong><small>Serão carregados somente os contatos pendentes.</small></div></div>
          <label>Campanha
            <select required value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Selecione uma campanha</option>
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name} — {item._count?.contacts ?? 0} contatos</option>)}
            </select>
          </label>
          {selected && <div className="selection-summary"><Users size={18}/><span><strong>{selected._count?.contacts ?? 0}</strong> contatos na lista da campanha</span></div>}
          {hasActiveQueue && <button type="button" className="secondary inline" onClick={() => navigate(`/campanhas/${campaignId}/fila`)}><Play size={17}/> Retomar fila ativa</button>}
          <div className="setup-step"><span>2</span><div><strong>Modelo de mensagem</strong><small>O conteúdo e o anexo do modelo serão aplicados à campanha.</small></div></div>
          <label>Modelo
            <select required value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Selecione um modelo</option>
              {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="setup-step"><span>3</span><div><strong>Intervalo entre contatos</strong><small>O próximo contato só é liberado após a confirmação manual e a pausa.</small></div></div>
          <div className="form-grid">
            <label>Mínimo (segundos)<input name="minSeconds" type="number" min="0" max="3600" defaultValue="20" required /></label>
            <label>Máximo (segundos)<input name="maxSeconds" type="number" min="0" max="3600" defaultValue="40" required /></label>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary inline" disabled={busy || !campaignId || !templateId}><Play size={18}/>{busy ? "Preparando…" : "Preparar fila"}</button>
        </form>
        <section className="panel safety-note"><ShieldCheck size={28}/><h3>Operação assistida</h3><p>Cada conversa é aberta individualmente. O operador revisa a mensagem, envia no WhatsApp e confirma o resultado antes de seguir.</p></section>
      </div>
    </Page>
  );
}
function Queue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<QueueItem>();
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [nextIndex, setNextIndex] = useState<number>();
  const [pendingRemoval, setPendingRemoval] = useState<QueueItem>();
  const config: SendConfig = (() => {
    try { return JSON.parse(localStorage.getItem(`send-config:${id}`) || ""); }
    catch { return { minSeconds: 0, maxSeconds: 0 }; }
  })();
  const load = () =>
    api<{ items: QueueItem[]; total: number }>(
      `/campaigns/${id}/queue?pageSize=200`,
    ).then((x) => {
      setItems(x.items);
      const firstPending = x.items.findIndex((item) => item.status === "PENDING");
      setIndex(firstPending >= 0 ? firstPending : Math.max(0, x.items.length - 1));
    });
  useEffect(() => {
    void load();
  }, [id]);
  useEffect(() => {
    const item = items[index];
    if (item)
      api<QueueItem>(`/campaigns/${id}/queue/${item.id}`).then(setDetail);
    else setDetail(undefined);
  }, [items, index, id]);
  useEffect(() => {
    if (!nextIndex || paused || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [nextIndex, paused, remaining]);
  useEffect(() => {
    if (nextIndex === undefined || remaining > 0) return;
    setIndex(nextIndex);
    setNextIndex(undefined);
    setPaused(false);
  }, [remaining, nextIndex]);
  async function event(type: string) {
    if (!detail) return;
    await api(`/campaigns/${id}/queue/${detail.id}/events`, {
      method: "POST",
      body: JSON.stringify({ eventType: type }),
    });
    if (type !== "OPENED_WHATSAPP") {
      setItems((old) =>
        old.map((x, i) => (i === index ? { ...x, status: type } : x)),
      );
      const target = Math.min(index + 1, items.length - 1);
      if (target !== index) {
        const wait = Math.floor(Math.random() * (config.maxSeconds - config.minSeconds + 1)) + config.minSeconds;
        setRemaining(wait);
        setNextIndex(target);
      }
    }
  }
  async function open() {
    if (!detail) return;
    await event("OPENED_WHATSAPP");
    window.open(detail.whatsappUrl, "_blank", "noopener,noreferrer");
  }
  async function removeFromQueue() {
    if (!pendingRemoval) return;
    await api(`/campaigns/${id}/queue/${pendingRemoval.id}`, { method: "DELETE" });
    const remainingItems = items.filter((item) => item.id !== pendingRemoval.id);
    setItems(remainingItems);
    setPendingRemoval(undefined);
    setIndex((value) => Math.min(value, Math.max(0, remainingItems.length - 1)));
  }
  function finishQueue() {
    localStorage.removeItem(`send-config:${id}`);
    navigate("/envios");
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (nextIndex !== undefined) return;
      if (e.key.toLowerCase() === "w") open();
      if (e.key.toLowerCase() === "e") event("SENT");
      if (e.key.toLowerCase() === "n") event("NOT_SENT");
      if (e.key.toLowerCase() === "s") event("NO_WHATSAPP");
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, items.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [detail, index, items.length, nextIndex]);
  if (!detail)
    return (
      <Page title="Fila de envio" back={`/campanhas/${id}`} action={<button className="secondary inline" onClick={finishQueue}>Encerrar fila</button>}>
        <Empty text="Nenhum contato disponível nesta campanha" />
      </Page>
    );
  const done = items.filter((x) => x.status !== "PENDING").length;
  return (
    <Page
      title="Fila de envio"
      subtitle={`Contato ${index + 1} de ${items.length}`}
      back={`/campanhas/${id}`}
      action={<button className="secondary inline" onClick={finishQueue}>Encerrar fila</button>}
    >
      <div className="queue-progress">
        <div
          style={{
            width: `${items.length ? (done / items.length) * 100 : 0}%`,
          }}
        />
      </div>
      {nextIndex !== undefined && (
        <section className="cooldown-bar">
          <Timer size={20}/>
          <div><strong>{paused ? "Intervalo pausado" : `Próximo contato em ${remaining}s`}</strong><span>O WhatsApp não será aberto automaticamente.</span></div>
          <button className="secondary inline" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? "Retomar" : "Pausar"}</button>
          <button className="ghost" onClick={() => setRemaining(0)}>Liberar agora</button>
        </section>
      )}
      <section className="queue-card">
        <div className="queue-head">
          <div className="avatar large">{detail.contact.name?.[0] || "?"}</div>
          <div>
            <span className="eyebrow">CONTATO ATUAL</span>
            <h2>{detail.contact.name || "Sem nome"}</h2>
            <p>
              {detail.contact.phone}{" "}
              {detail.contact.city && `• ${detail.contact.city}`}
            </p>
          </div>
          <span className={`badge ${detail.status.toLowerCase()}`}>
            {statusLabel(detail.status)}
          </span>
        </div>
        <div className="message-preview">
          <span>Mensagem personalizada</span>
          <pre>
            {detail.generatedMessage || "A campanha ainda não possui mensagem."}
          </pre>
          <button
            className="copy"
            onClick={() =>
              navigator.clipboard.writeText(detail.generatedMessage || "")
            }
          >
            <Copy size={16} /> Copiar mensagem
          </button>
        </div>
        <button className="whatsapp" onClick={open} disabled={nextIndex !== undefined}>
          <ExternalLink size={20} />
          Abrir WhatsApp <kbd>W</kbd>
        </button>
        <div className="result">
          <span>Qual foi o resultado?</span>
          <div>
            <button className="sent" disabled={nextIndex !== undefined} onClick={() => event("SENT")}>
              <Check size={17} />
              Enviado <kbd>E</kbd>
            </button>
            <button disabled={nextIndex !== undefined} onClick={() => event("NOT_SENT")}>
              Não enviado <kbd>N</kbd>
            </button>
            <button disabled={nextIndex !== undefined} onClick={() => event("NO_WHATSAPP")}>
              Sem WhatsApp <kbd>S</kbd>
            </button>
            <button className="danger-button" disabled={nextIndex !== undefined} onClick={() => setPendingRemoval(detail)}>
              <Trash2 size={16}/> Remover da lista
            </button>
          </div>
        </div>
        <div className="queue-nav">
          <button disabled={!index} onClick={() => setIndex(index - 1)}>
            <ChevronLeft />
            Anterior
          </button>
          <button
            disabled={index === items.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Próximo
            <ChevronRight />
          </button>
        </div>
      </section>
      {pendingRemoval && <ConfirmDialog title="Remover contato desta lista?" description={`${pendingRemoval.contact.name || pendingRemoval.contact.phone} será removido somente desta campanha. O cadastro geral será preservado.`} confirmLabel="Remover da lista" close={() => setPendingRemoval(undefined)} onConfirm={removeFromQueue} />}
    </Page>
  );
}
function Page({
  title,
  subtitle,
  action,
  children,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  back?: string;
}) {
  return (
    <main className="page">
      <div className="page-head">
        <div>
          {back && (
            <NavLink className="back" to={back}>
              <ArrowLeft size={17} />
              Voltar
            </NavLink>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}
function ConfirmDialog({
  title,
  description,
  confirmLabel,
  close,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  close: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, close]);
  async function confirmAction() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      close();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a ação",
      );
      setBusy(false);
    }
  }
  return (
    <div className="overlay confirm-overlay" role="presentation">
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <div className="confirm-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="confirm-content">
          <h2 id="confirm-title">{title}</h2>
          <p id="confirm-description">{description}</p>
          {error && <div className="error">{error}</div>}
        </div>
        <div className="confirm-actions">
          <button className="ghost" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button
            className="danger-button"
            disabled={busy}
            onClick={confirmAction}
            autoFocus
          >
            {busy ? "Processando…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section className="modal">
        <div className="panel-title">
          <h2>{title}</h2>
          <button className="close" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>○</span>
      <p>{text}</p>
    </div>
  );
}
function Placeholder() {
  return (
    <Page title="Em preparação">
      <section className="panel">
        <p className="hint">
          Este módulo está planejado para a próxima fase. O fluxo principal de
          campanhas já está disponível.
        </p>
      </section>
    </Page>
  );
}
const statusLabel = (s: string) =>
  (
    ({
      DRAFT: "Rascunho",
      ACTIVE: "Ativa",
      PAUSED: "Pausada",
      FINISHED: "Finalizada",
      ARCHIVED: "Arquivada",
      PENDING: "Pendente",
      SENT: "Enviado",
      NOT_SENT: "Não enviado",
      NO_WHATSAPP: "Sem WhatsApp",
      ERROR: "Erro",
      SKIPPED: "Ignorado",
    }) as Record<string, string>
  )[s] || s;
const date = (d: string) =>
  new Intl.DateTimeFormat("pt-BR").format(new Date(d));
