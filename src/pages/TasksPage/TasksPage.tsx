import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, uiStore } from '@/store';
import { Card, Button, Badge, Input, Select, Modal } from '@/components/UI';
import type { Task, TaskFormData, TaskStatus, TaskPriority } from '@/types';
import { getDateMinYearError, MIN_FORM_DATE } from '@/utils';
import styles from './TasksPage.module.scss';

export const TasksPage = observer(() => {
  const {
    tasksByStatus, activeProjects, allActiveMembers,
    getProjectById, getMemberById,
    createTask, updateTask, deleteTask,
    loadAllData, tasksLoading, setFilter, filters,
  } = dataStore;

  const { canCreateTasks, canEditTasks, isAdmin } = authStore;

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm]               = useState<TaskFormData>({
    projectId: '', title: '', description: '', status: 'todo', priority: 'medium', tags: [],
  });
  const [dateErrors, setDateErrors] = useState<{ dueDate?: string }>({});

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const statusLabels: Record<TaskStatus, string> = {
    backlog: 'Бэклог', todo: 'К выполнению', in_progress: 'В работе',
    review: 'На проверке', done: 'Готово',
  };
  const priorityLabels: Record<TaskPriority, string> = {
    low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный',
  };
  const priorityColors: Record<TaskPriority, 'info' | 'warning' | 'error' | 'success'> = {
    low: 'info', medium: 'warning', high: 'error', urgent: 'error',
  };

  const projectOptions = [
    { value: '', label: 'Все проекты' },
    ...activeProjects.map(p => ({ value: p.id, label: p.name })),
  ];
  const statusOptions = [
    { value: '', label: 'Все статусы' },
    ...Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l })),
  ];

  const openCreateModal = () => {
    setEditingTask(null);
    setDateErrors({});
    setForm({ projectId: activeProjects[0]?.id || '', title: '', description: '', status: 'todo', priority: 'medium', tags: [] });
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setDateErrors({});
    setForm({
      projectId: task.projectId, sprintId: task.sprintId,
      title: task.title, description: task.description,
      status: task.status, priority: task.priority,
      assigneeId: task.assigneeId, estimatedHours: task.estimatedHours,
      dueDate: task.dueDate, tags: task.tags,
    });
    setModalOpen(true);
  };

  const validateDates = () => {
    const nextErrors = { dueDate: getDateMinYearError(form.dueDate, 'Срок') };
    setDateErrors(nextErrors);
    return !nextErrors.dueDate;
  };

  const handleSave = async () => {
    if (!form.title || !form.projectId) { uiStore.showError('Заполните обязательные поля'); return; }
    if (!validateDates()) return;
    if (editingTask) { await updateTask(editingTask.id, form); uiStore.showSuccess('Задача обновлена'); }
    else             { await createTask(form);                 uiStore.showSuccess('Задача создана'); }
    setModalOpen(false);
  };

  // Удаление задачи (только для администратора)
  const handleDeleteTask = (id: string) => {
    uiStore.showConfirm('Удаление задачи', 'Удалить задачу? Это действие необратимо.', async () => {
      const ok = await deleteTask(id);
      if (ok) uiStore.showSuccess('Задача удалена');
      else    uiStore.showError('Не удалось удалить задачу');
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Задачи</h1>
          <p className={styles.subtitle}>Управление задачами проектов</p>
        </div>
        {canCreateTasks() && <Button variant="primary" onClick={openCreateModal}>Создать задачу</Button>}
      </div>

      <Card className={styles.toolbar}>
        <Input
          placeholder="Поиск задач..."
          value={filters.search || ''}
          onChange={(e) => setFilter('search', e.target.value || undefined)}
          className={styles.searchInput}
        />
        <Select
          options={projectOptions}
          value={filters.projectId || ''}
          onChange={(e) => setFilter('projectId', e.target.value || undefined)}
        />
        <Select
          options={statusOptions}
          value={filters.status || ''}
          onChange={(e) => setFilter('status', e.target.value || undefined)}
        />
      </Card>

      {tasksLoading ? (
        <Card className={styles.loading}>Загрузка...</Card>
      ) : (
        <div className={styles.kanban}>
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3>{label}</h3>
                <Badge variant="info">{tasksByStatus[status]?.length || 0}</Badge>
              </div>
              <div className={styles.tasksList}>
                {tasksByStatus[status]?.map(task => (
                  <Card
                    key={task.id}
                    className={styles.taskCard}
                    hoverable
                    onClick={() => canEditTasks() && openEditModal(task)}
                  >
                    <div className={styles.taskHeader}>
                      <Badge variant={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>

                      {/* Кнопка удаления — только для администратора */}
                      {isAdmin && (
                        <button
                          className={styles.deleteBtn}
                          title="Удалить задачу"
                          onClick={(e) => {
                            e.stopPropagation(); // не открываем модалку редактирования
                            handleDeleteTask(task.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <h4 className={styles.taskTitle}>{task.title}</h4>
                    <p className={styles.taskProject}>{getProjectById(task.projectId)?.name}</p>

                    {task.assigneeId && (
                      <div className={styles.taskAssignee}>
                        <span className={styles.avatar}>
                          {getMemberById(task.assigneeId)?.firstName[0]
                            ?? allActiveMembers.find(m => m.id === task.assigneeId)?.firstName[0]
                            ?? '?'}
                        </span>
                        <span>
                          {getMemberById(task.assigneeId)?.lastName
                            ?? allActiveMembers.find(m => m.id === task.assigneeId)?.lastName
                            ?? '—'}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Редактировать задачу' : 'Создать задачу'}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSave}>Сохранить</Button>
          </div>
        }
      >
        <div className={styles.form}>
          <Select
            label="Проект *"
            options={activeProjects.map(p => ({ value: p.id, label: p.name }))}
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          />
          <Input
            label="Название *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Статус"
            options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
          />
          <Select
            label="Приоритет"
            options={Object.entries(priorityLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
          />
          {/* Исполнитель: все участники Firebase + зарегистрированные пользователи */}
          <Select
            label="Исполнитель"
            options={[
              { value: '', label: 'Не назначен' },
              ...allActiveMembers.map(m => ({
                value: m.id,
                label: m.lastName ? `${m.lastName} ${m.firstName}` : m.firstName,
              })),
            ]}
            value={form.assigneeId || ''}
            onChange={(e) => setForm({ ...form, assigneeId: e.target.value || undefined })}
          />
          <Input
            label="Оценка (часы)"
            type="number"
            value={form.estimatedHours || ''}
            onChange={(e) => setForm({ ...form, estimatedHours: parseInt(e.target.value) || undefined })}
          />
          <Input
            label="Срок"
            type="date"
            min={MIN_FORM_DATE}
            value={form.dueDate || ''}
            error={dateErrors.dueDate}
            onChange={(e) => { setDateErrors({ dueDate: undefined }); setForm({ ...form, dueDate: e.target.value || undefined }); }}
          />
        </div>
      </Modal>
    </div>
  );
});
