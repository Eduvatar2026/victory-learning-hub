'use client';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import ChatBot from '@/components/ChatBot';
import TextbookLibrary from '@/components/TextbookLibrary';
import QuizSystem from '@/components/QuizSystem';
import Achievements from '@/components/Achievements';
import Notification from '@/components/Notification';

function AppContent() {
  const { currentView } = useApp();

  const viewComponents = {
    dashboard: Dashboard,
    chat: ChatBot,
    library: TextbookLibrary,
    quiz: QuizSystem,
    achievements: Achievements,
  };

  const CurrentComponent = viewComponents[currentView] || Dashboard;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <CurrentComponent />
      </main>
      <Notification />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
