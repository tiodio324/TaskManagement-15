import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, uiStore } from '@/store';
import { Card, Button, Badge, Input, Modal, Select } from '@/components/UI';
import type { Project, ProjectFormData, ProjectStatus } from '@/types';
import { getDateMinYearError, getDateRangeError, getRequiredDateError, MIN_FORM_DATE } from '@/utils';
import styles from './ProjectsPage.module.scss';

export const ProjectsPage = observer(() => {
  const { activeProjects, getTasksForProject, createProject, updateProject, deleteProject, loadAllData, projectsLoading } = dataStore;
  const { canManageProjects } = authStore;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormData>({ name: '', description: '', status: 'planning', startDate: '', memberIds: [] });
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; endDate?: string }>({});

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const statusLabels: Record<ProjectStatus, string> = { planning: 'Планирование', active: 'Активный', on_hold: 'Приостановлен', completed: 'Завершён', cancelled: 'Отменён' };
  const statusColors: Record<ProjectStatus, 'info' | 'success' | 'warning' | 'error'> = { planning: 'info', active: 'success', on_hold: 'warning', completed: 'success', cancelled: 'error' };

  const openCreateModal = () => { setEditingProject(null); setDateErrors({}); setForm({ name: '', description: '', status: 'planning', startDate: new Date().toISOString().split('T')[0], memberIds: [] }); setModalOpen(true); };
  const openEditModal = (project: Project) => { setEditingProject(project); setDateErrors({}); setForm({ name: project.name, description: project.description, status: project.status, startDate: project.startDate, endDate: project.endDate, memberIds: project.memberIds }); setModalOpen(true); };

  const validateDates = () => {
    const nextErrors = {
      startDate: getDateMinYearError(form.startDate, 'Дата начала'),
      endDate: getRequiredDateError(form.endDate, 'Дата окончания') || getDateMinYearError(form.endDate, 'Дата окончания') || getDateRangeError(form.startDate, form.endDate),
    };
    setDateErrors(nextErrors);
    return !nextErrors.startDate && !nextErrors.endDate;
  };

  const handleSave = async () => {
    if (!form.name) { uiStore.showError('Введите название проекта'); return; }
    if (!validateDates()) return;
    if (editingProject) { await updateProject(editingProject.id, form); uiStore.showSuccess('Проект обновлён'); }
    else { await createProject(form); uiStore.showSuccess('Проект создан'); }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    uiStore.showConfirm('Удаление проекта', 'Вы уверены?', async () => { await deleteProject(id); uiStore.showSuccess('Проект удалён'); });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Проекты</h1><p className={styles.subtitle}>Управление проектами команды</p></div>
        {canManageProjects() && <Button variant="primary" onClick={openCreateModal}>Создать проект</Button>}
      </div>

      {projectsLoading ? <Card className={styles.loading}>Загрузка...</Card> : (
        <div className={styles.projectsGrid}>
          {activeProjects.map(project => {
            const tasks = getTasksForProject(project.id);
            const completedTasks = tasks.filter(t => t.status === 'done').length;
            return (
              <Card key={project.id} className={styles.projectCard} hoverable onClick={() => canManageProjects() && openEditModal(project)}>
                <div className={styles.projectHeader}><h3>{project.name}</h3><Badge variant={statusColors[project.status]}>{statusLabels[project.status]}</Badge></div>
                <p className={styles.projectDescription}>{project.description}</p>
                <div className={styles.projectStats}>
                  <span>{tasks.length} задач</span><span>{completedTasks} выполнено</span>
                </div>
                {tasks.length > 0 && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${(completedTasks / tasks.length) * 100}%` }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'Редактировать проект' : 'Создать проект'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>{editingProject && <Button variant="ghost" onClick={() => { handleDelete(editingProject.id); setModalOpen(false); }}>Удалить</Button>}<Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          <Input label="Название *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Статус" options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })} />
          <Input label="Дата начала" type="date" min={MIN_FORM_DATE} value={form.startDate} error={dateErrors.startDate} onChange={(e) => { setDateErrors({ ...dateErrors, startDate: undefined }); setForm({ ...form, startDate: e.target.value }); }} />
          <Input label="Дата окончания *" type="date" min={MIN_FORM_DATE} required value={form.endDate || ''} error={dateErrors.endDate} onChange={(e) => { setDateErrors({ ...dateErrors, endDate: undefined }); setForm({ ...form, endDate: e.target.value || undefined }); }} />
        </div>
      </Modal>
    </div>
  );
});
