import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, uiStore } from '@/store';
import { Card, Button, Badge, Select, Modal, Input } from '@/components/UI';
import type { Sprint, SprintFormData, SprintStatus } from '@/types';
import styles from './SprintsPage.module.scss';

export const SprintsPage = observer(() => {
  const { activeSprints, activeProjects, getProjectById, getTasksForSprint, createSprint, updateSprint, deleteSprint, loadAllData, sprintsLoading, setFilter, filters } = dataStore;
  const { canManageSprints } = authStore;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [form, setForm] = useState<SprintFormData>({ projectId: '', name: '', goal: '', startDate: '', endDate: '', status: 'planning' });

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const statusLabels: Record<SprintStatus, string> = { planning: 'Планирование', active: 'Активный', completed: 'Завершён' };
  const statusColors: Record<SprintStatus, 'info' | 'success' | 'warning'> = { planning: 'info', active: 'success', completed: 'warning' };

  const filteredSprints = filters.projectId ? activeSprints.filter(s => s.projectId === filters.projectId) : activeSprints;
  const projectOptions = [{ value: '', label: 'Все проекты' }, ...activeProjects.map(p => ({ value: p.id, label: p.name }))];

  const openCreateModal = () => { setEditingSprint(null); setForm({ projectId: activeProjects[0]?.id || '', name: '', goal: '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'planning' }); setModalOpen(true); };
  const openEditModal = (sprint: Sprint) => { setEditingSprint(sprint); setForm({ projectId: sprint.projectId, name: sprint.name, goal: sprint.goal, startDate: sprint.startDate, endDate: sprint.endDate, status: sprint.status }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.projectId || !form.endDate) { uiStore.showError('Заполните обязательные поля'); return; }
    if (editingSprint) { await updateSprint(editingSprint.id, form); uiStore.showSuccess('Спринт обновлён'); }
    else { await createSprint(form); uiStore.showSuccess('Спринт создан'); }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => { uiStore.showConfirm('Удаление спринта', 'Вы уверены?', async () => { await deleteSprint(id); uiStore.showSuccess('Спринт удалён'); }); };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Спринты</h1><p className={styles.subtitle}>Планирование итераций</p></div>
        {canManageSprints() && <Button variant="primary" onClick={openCreateModal}>Создать спринт</Button>}
      </div>

      <Card className={styles.toolbar}>
        <Select options={projectOptions} value={filters.projectId || ''} onChange={(e) => setFilter('projectId', e.target.value || undefined)} />
      </Card>

      {sprintsLoading ? <Card className={styles.loading}>Загрузка...</Card> : filteredSprints.length === 0 ? <Card className={styles.empty}>Спринты не найдены</Card> : (
        <div className={styles.sprintsList}>
          {filteredSprints.map(sprint => {
            const tasks = getTasksForSprint(sprint.id);
            const completedTasks = tasks.filter(t => t.status === 'done').length;
            const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
            return (
              <Card key={sprint.id} className={styles.sprintCard} hoverable onClick={() => canManageSprints() && openEditModal(sprint)}>
                <div className={styles.sprintHeader}>
                  <div><h3>{sprint.name}</h3><p className={styles.projectName}>{getProjectById(sprint.projectId)?.name}</p></div>
                  <Badge variant={statusColors[sprint.status]}>{statusLabels[sprint.status]}</Badge>
                </div>
                <p className={styles.sprintGoal}>{sprint.goal}</p>
                <div className={styles.sprintDates}>{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</div>
                <div className={styles.sprintProgress}>
                  <div className={styles.progressInfo}><span>{completedTasks}/{tasks.length} задач</span><span>{progress}%</span></div>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSprint ? 'Редактировать спринт' : 'Создать спринт'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>{editingSprint && <Button variant="ghost" onClick={() => { handleDelete(editingSprint.id); setModalOpen(false); }}>Удалить</Button>}<Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          <Select label="Проект *" options={activeProjects.map(p => ({ value: p.id, label: p.name }))} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
          <Input label="Название *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Цель спринта" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Input label="Дата начала *" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Дата окончания *" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Select label="Статус" options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SprintStatus })} />
        </div>
      </Modal>
    </div>
  );
});
