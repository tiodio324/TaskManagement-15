import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { navigationStore, dataStore } from '@/store';
import { MainLayout, LoginModal, ConfirmModal, Toast } from '@/components';
import { HomePage, TasksPage, ProjectsPage, SprintsPage, AdminPage } from '@/pages';

const PageRouter = observer(() => {
  const { currentPage } = navigationStore;

  switch (currentPage) {
    case 'home': return <HomePage />;
    case 'tasks': return <TasksPage />;
    case 'projects': return <ProjectsPage />;
    case 'sprints': return <SprintsPage />;
    case 'admin':
    case 'admin-tasks':
    case 'admin-projects': return <AdminPage />;
    default: return <HomePage />;
  }
});

const App = observer(() => {
  useEffect(() => { dataStore.loadAllData(); }, []);

  return (
    <>
      <MainLayout><PageRouter /></MainLayout>
      <LoginModal />
      <ConfirmModal />
      <Toast />
    </>
  );
});

export default App;
