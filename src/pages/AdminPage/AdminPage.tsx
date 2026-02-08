import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, uiStore } from '@/store';
import { Card, Button, Table, Modal, Input, Select } from '@/components/UI';
import type { TableColumn } from '@/components/UI';
import type { Project, Member, ProjectFormData, MemberFormData, ProjectStatus, MemberRole } from '@/types';
import styles from './AdminPage.module.scss';

type AdminTab = 'projects' | 'members';

export const AdminPage = observer(() => {
  const { projects, members, createProject, updateProject, deleteProject, createMember, deleteMember, loadAllData, projectsLoading, membersLoading } = dataStore;
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [projectForm, setProjectForm] = useState<ProjectFormData>({ name: '', description: '', status: 'planning', startDate: '', memberIds: [] });
  const [memberForm, setMemberForm] = useState<MemberFormData>({ firstName: '', lastName: '', email: '', role: 'developer' });

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const resetForms = () => { setProjectForm({ name: '', description: '', status: 'planning', startDate: '', memberIds: [] }); setMemberForm({ firstName: '', lastName: '', email: '', role: 'developer' }); setEditingId(null); };
  const openCreateModal = () => { resetForms(); setModalMode('create'); setModalOpen(true); };
  const openEditModal = (item: Project | Member) => {
    setModalMode('edit'); setEditingId(item.id);
    if (activeTab === 'projects') { const p = item as Project; setProjectForm({ name: p.name, description: p.description, status: p.status, startDate: p.startDate, endDate: p.endDate, memberIds: p.memberIds }); }
    else { const m = item as Member; setMemberForm({ firstName: m.firstName, lastName: m.lastName, email: m.email, role: m.role }); }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'projects') { if (!projectForm.name) { uiStore.showError('Введите название'); return; } if (modalMode === 'create') await createProject(projectForm); else if (editingId) await updateProject(editingId, projectForm); }
      else { if (!memberForm.firstName || !memberForm.lastName || !memberForm.email) { uiStore.showError('Заполните обязательные поля'); return; } if (modalMode === 'create') await createMember(memberForm); }
      uiStore.showSuccess(modalMode === 'create' ? 'Запись добавлена' : 'Запись обновлена'); setModalOpen(false); resetForms();
    } catch { uiStore.showError('Ошибка сохранения'); }
  };

  const handleDelete = async (id: string) => { uiStore.showConfirm('Удаление', 'Вы уверены?', async () => { if (activeTab === 'projects') await deleteProject(id); else await deleteMember(id); uiStore.showSuccess('Запись удалена'); }); };

  const statusLabels: Record<ProjectStatus, string> = { planning: 'Планирование', active: 'Активный', on_hold: 'Приостановлен', completed: 'Завершён', cancelled: 'Отменён' };
  const roleLabels: Record<MemberRole, string> = { developer: 'Разработчик', designer: 'Дизайнер', qa: 'Тестировщик', lead: 'Тимлид', manager: 'Менеджер' };

  const projectColumns: TableColumn<Project>[] = [
    { key: 'name', title: 'Название', render: (p: Project) => p.name },
    { key: 'status', title: 'Статус', render: (p: Project) => statusLabels[p.status] || p.status },
    { key: 'startDate', title: 'Начало', width: '120px', render: (p: Project) => new Date(p.startDate).toLocaleDateString('ru-RU') },
    { key: 'actions', title: '', width: '100px', render: (row: Project) => (
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></Button>
        <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></Button>
      </div>
    )},
  ];

  const memberColumns: TableColumn<Member>[] = [
    { key: 'lastName', title: 'Фамилия', render: (m: Member) => m.lastName },
    { key: 'firstName', title: 'Имя', render: (m: Member) => m.firstName },
    { key: 'email', title: 'Email', render: (m: Member) => m.email },
    { key: 'role', title: 'Роль', render: (m: Member) => roleLabels[m.role] || m.role },
    { key: 'actions', title: '', width: '100px', render: (row: Member) => (
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></Button>
      </div>
    )},
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Управление</h1><p className={styles.subtitle}>Администрирование системы</p></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`} onClick={() => setActiveTab('projects')}>Проекты</button>
        <button className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`} onClick={() => setActiveTab('members')}>Участники</button>
      </div>
      <Card className={styles.toolbar}><Button variant="primary" onClick={openCreateModal}>Добавить {activeTab === 'projects' ? 'проект' : 'участника'}</Button></Card>
      <Card padding="none">
        {activeTab === 'projects' && <Table columns={projectColumns} data={projects.filter(p => p.isActive)} keyField="id" loading={projectsLoading} emptyText="Нет проектов" />}
        {activeTab === 'members' && <Table columns={memberColumns} data={members.filter(m => m.isActive)} keyField="id" loading={membersLoading} emptyText="Нет участников" />}
      </Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`${modalMode === 'create' ? 'Добавить' : 'Редактировать'} ${activeTab === 'projects' ? 'проект' : 'участника'}`}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          {activeTab === 'projects' && (<>
            <Input label="Название *" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
            <Input label="Описание" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            <Select label="Статус" options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))} value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })} />
            <Input label="Дата начала" type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
          </>)}
          {activeTab === 'members' && (<>
            <Input label="Фамилия *" value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} />
            <Input label="Имя *" value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} />
            <Input label="Email *" type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
            <Select label="Роль" options={Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l }))} value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as MemberRole })} />
          </>)}
        </div>
      </Modal>
    </div>
  );
});
