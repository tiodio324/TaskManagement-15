import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, uiStore } from '@/store';
import { Card, Button, Table, Modal, Input, Select } from '@/components/UI';
import type { TableColumn } from '@/components/UI';
import type { Project, Member, ProjectFormData, ProjectStatus } from '@/types';
import { getDateMinYearError, getDateRangeError, getRequiredDateError, MIN_FORM_DATE } from '@/utils';
import styles from './AdminPage.module.scss';

type AdminTab = 'projects' | 'members';

// ──────────────────────────────────────────────────────────────────────────────
// Помощник: отличаем зарегистрированных пользователей от Firebase-участников
// Зарегистрированные имеют id вида "user_<timestamp>_<random>"
const isRegisteredUser = (id: string) => id.startsWith('user_');

export const AdminPage = observer(() => {
  const {
    projects,
    allActiveMembers,
    createProject, updateProject, deleteProject,
    deleteMember, deleteRegisteredMember,
    loadAllData,
    projectsLoading, membersLoading,
  } = dataStore;

  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    name: '', description: '', status: 'planning', startDate: '', memberIds: [],
  });
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; endDate?: string }>({});

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Сброс формы ────────────────────────────────────────────────────────────
  const resetForms = () => {
    setProjectForm({ name: '', description: '', status: 'planning', startDate: '', memberIds: [] });
    setDateErrors({});
    setEditingId(null);
  };

  // ── Открытие модалки проекта ───────────────────────────────────────────────
  const openCreateProjectModal = () => {
    resetForms();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    setModalMode('edit');
    setEditingId(project.id);
    setDateErrors({});
    setProjectForm({
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      memberIds: project.memberIds,
    });
    setModalOpen(true);
  };

  // ── Валидация дат ──────────────────────────────────────────────────────────
  const validateProjectDates = () => {
    const nextErrors = {
      startDate: getDateMinYearError(projectForm.startDate, 'Дата начала'),
      endDate:
        getRequiredDateError(projectForm.endDate, 'Дата окончания') ||
        getDateMinYearError(projectForm.endDate, 'Дата окончания') ||
        getDateRangeError(projectForm.startDate, projectForm.endDate),
    };
    setDateErrors(nextErrors);
    return !nextErrors.startDate && !nextErrors.endDate;
  };

  // ── Сохранение проекта ─────────────────────────────────────────────────────
  const handleSaveProject = async () => {
    try {
      if (!projectForm.name) { uiStore.showError('Введите название'); return; }
      if (!validateProjectDates()) return;
      if (modalMode === 'create') await createProject(projectForm);
      else if (editingId)        await updateProject(editingId, projectForm);
      uiStore.showSuccess(modalMode === 'create' ? 'Проект добавлен' : 'Проект обновлён');
      setModalOpen(false);
      resetForms();
    } catch {
      uiStore.showError('Ошибка сохранения');
    }
  };

  // ── Удаление проекта ───────────────────────────────────────────────────────
  const handleDeleteProject = (id: string) => {
    uiStore.showConfirm('Удаление проекта', 'Вы уверены? Это действие необратимо.', async () => {
      await deleteProject(id);
      uiStore.showSuccess('Проект удалён');
    });
  };

  // ── Удаление участника ─────────────────────────────────────────────────────
  // Зарегистрированные пользователи хранятся в localStorage → deleteRegisteredMember
  // Участники, добавленные вручную (Firebase) → deleteMember
  const handleDeleteMember = (member: Member) => {
    const displayName = member.lastName
      ? `${member.lastName} ${member.firstName}`
      : member.firstName;

    uiStore.showConfirm(
      'Удаление участника',
      `Удалить «${displayName}»? Пользователь потеряет доступ к системе.`,
      async () => {
        if (isRegisteredUser(member.id)) {
          deleteRegisteredMember(member.id);
        } else {
          await deleteMember(member.id);
        }
        uiStore.showSuccess('Участник удалён');
      },
    );
  };

  // ── Метки ──────────────────────────────────────────────────────────────────
  const statusLabels: Record<ProjectStatus, string> = {
    planning: 'Планирование', active: 'Активный',
    on_hold: 'Приостановлен', completed: 'Завершён', cancelled: 'Отменён',
  };

  // ── Колонки таблицы проектов ───────────────────────────────────────────────
  const projectColumns: TableColumn<Project>[] = [
    { key: 'name',      title: 'Название', render: (p: Project) => p.name },
    { key: 'status',    title: 'Статус',   render: (p: Project) => statusLabels[p.status] || p.status },
    { key: 'startDate', title: 'Начало',   width: '120px',
      render: (p: Project) => new Date(p.startDate).toLocaleDateString('ru-RU') },
    {
      key: 'actions', title: '', width: '100px',
      render: (row: Project) => (
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={() => openEditProjectModal(row)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteProject(row.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </Button>
        </div>
      ),
    },
  ];

  // ── Колонки таблицы участников ─────────────────────────────────────────────
  const memberColumns: TableColumn<Member>[] = [
    {
      key: 'lastName', title: 'Имя',
      render: (m: Member) => (
        <div className={styles.memberName}>
          <span className={styles.avatar}>
            {m.firstName?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span>{m.lastName ? `${m.lastName} ${m.firstName}` : m.firstName}</span>
        </div>
      ),
    },
    { key: 'email', title: 'Email', render: (m: Member) => m.email },
    {
      key: 'source', title: 'Источник', width: '160px',
      render: (m: Member) => isRegisteredUser(m.id)
        ? <span className={styles.badgeRegistered}>Зарегистрирован</span>
        : <span className={styles.badgeManual}>Создан вручную</span>,
    },
    {
      key: 'actions', title: '', width: '60px',
      render: (row: Member) => (
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteMember(row)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление</h1>
        <p className={styles.subtitle}>Администрирование системы</p>
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Проекты
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Участники
        </button>
      </div>

      {/* Тулбар — кнопка "Добавить" только для проектов */}
      {activeTab === 'projects' && (
        <Card className={styles.toolbar}>
          <Button variant="primary" onClick={openCreateProjectModal}>
            Добавить проект
          </Button>
        </Card>
      )}

      {/* Подсказка для вкладки участников */}
      {activeTab === 'members' && (
        <Card className={styles.membersHint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Участники добавляются автоматически через регистрацию в системе.
            Здесь можно только удалить участника.
          </span>
        </Card>
      )}

      {/* Таблицы */}
      <Card padding="none">
        {activeTab === 'projects' && (
          <Table
            columns={projectColumns}
            data={projects.filter(p => p.isActive)}
            keyField="id"
            loading={projectsLoading}
            emptyText="Нет проектов"
          />
        )}
        {activeTab === 'members' && (
          <Table
            columns={memberColumns}
            data={allActiveMembers}
            keyField="id"
            loading={membersLoading}
            emptyText="Нет зарегистрированных участников"
          />
        )}
      </Card>

      {/* Модалка — только для проектов */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${modalMode === 'create' ? 'Добавить' : 'Редактировать'} проект`}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSaveProject}>Сохранить</Button>
          </div>
        }
      >
        <div className={styles.form}>
          <Input
            label="Название *"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          />
          <Input
            label="Описание"
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          />
          <Select
            label="Статус"
            options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={projectForm.status}
            onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}
          />
          <Input
            label="Дата начала"
            type="date"
            min={MIN_FORM_DATE}
            value={projectForm.startDate}
            error={dateErrors.startDate}
            onChange={(e) => {
              setDateErrors({ ...dateErrors, startDate: undefined });
              setProjectForm({ ...projectForm, startDate: e.target.value });
            }}
          />
          <Input
            label="Дата окончания *"
            type="date"
            min={MIN_FORM_DATE}
            required
            value={projectForm.endDate || ''}
            error={dateErrors.endDate}
            onChange={(e) => {
              setDateErrors({ ...dateErrors, endDate: undefined });
              setProjectForm({ ...projectForm, endDate: e.target.value || undefined });
            }}
          />
        </div>
      </Modal>
    </div>
  );
});
