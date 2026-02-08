import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, uiStore } from '@/store';
import { Card, Button, Badge, Input, Select, Modal } from '@/components/UI';
import type { Task, TaskFormData, TaskStatus, TaskPriority } from '@/types';
import styles from './TasksPage.module.scss';

export const TasksPage = observer(() => {
  const { tasksByStatus, activeProjects, activeMembers, getProjectById, getMemberById, createTask, updateTask, loadAllData, tasksLoading, setFilter, filters } = dataStore;
  const { canCreateTasks, canEditTasks } = authStore;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>({ projectId: '', title: '', description: '', status: 'todo', priority: 'medium', tags: [] });

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const statusLabels: Record<TaskStatus, string> = { backlog: 'Бэклог', todo: 'К выполнению', in_progress: 'В работе', review: 'На проверке', done: 'Готово' };
  const priorityLabels: Record<TaskPriority, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный' };
  const priorityColors: Record<TaskPriority, 'info' | 'warning' | 'error' | 'success'> = { low: 'info', medium: 'warning', high: 'error', urgent: 'error' };

  const projectOptions = [{ value: '', label: 'Все проекты' }, ...activeProjects.map(p => ({ value: p.id, label: p.name }))];
  const statusOptions = [{ value: '', label: 'Все статусы' }, ...Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))];

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({ projectId: activeProjects[0]?.id || '', title: '', description: '', status: 'todo', priority: 'medium', tags: [] });
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setForm({ projectId: task.projectId, sprintId: task.sprintId, title: task.title, description: task.description, status: task.status, priority: task.priority, assigneeId: task.assigneeId, estimatedHours: task.estimatedHours, dueDate: task.dueDate, tags: task.tags });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.projectId) { uiStore.showError('Заполните обязательные поля'); return; }
    if (editingTask) { await updateTask(editingTask.id, form); uiStore.showSuccess('Задача обновлена'); }
    else { await createTask(form); uiStore.showSuccess('Задача создана'); }
    setModalOpen(false);
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
        <Input placeholder="Поиск задач..." value={filters.search || ''} onChange={(e) => setFilter('search', e.target.value || undefined)} className={styles.searchInput} />
        <Select options={projectOptions} value={filters.projectId || ''} onChange={(e) => setFilter('projectId', e.target.value || undefined)} />
        <Select options={statusOptions} value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value || undefined)} />
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
                  <Card key={task.id} className={styles.taskCard} hoverable onClick={() => canEditTasks() && openEditModal(task)}>
                    <div className={styles.taskHeader}>
                      <Badge variant={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                    </div>
                    <h4 className={styles.taskTitle}>{task.title}</h4>
                    <p className={styles.taskProject}>{getProjectById(task.projectId)?.name}</p>
                    {task.assigneeId && (
                      <div className={styles.taskAssignee}>
                        <span className={styles.avatar}>{getMemberById(task.assigneeId)?.firstName[0]}</span>
                        <span>{getMemberById(task.assigneeId)?.lastName}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Редактировать задачу' : 'Создать задачу'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          <Select label="Проект *" options={activeProjects.map(p => ({ value: p.id, label: p.name }))} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
          <Input label="Название *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Статус" options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} />
          <Select label="Приоритет" options={Object.entries(priorityLabels).map(([v, l]) => ({ value: v, label: l }))} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} />
          <Select label="Исполнитель" options={[{ value: '', label: 'Не назначен' }, ...activeMembers.map(m => ({ value: m.id, label: `${m.lastName} ${m.firstName}` }))]} value={form.assigneeId || ''} onChange={(e) => setForm({ ...form, assigneeId: e.target.value || undefined })} />
          <Input label="Оценка (часы)" type="number" value={form.estimatedHours || ''} onChange={(e) => setForm({ ...form, estimatedHours: parseInt(e.target.value) || undefined })} />
          <Input label="Срок" type="date" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value || undefined })} />
        </div>
      </Modal>
    </div>
  );
});
