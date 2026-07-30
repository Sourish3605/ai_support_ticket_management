import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import MyTicketsPage from '../pages/MyTicketsPage';
import CreateTicketPage from '../pages/CreateTicketPage';
import AllTicketsPage from '../pages/AllTicketsPage';
import AiAssistantPage from '../pages/AiAssistantPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import TicketDetailsPage from '../pages/TicketDetailsPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/create-ticket" element={<CreateTicketPage />} />
        <Route path="/all-tickets" element={<AllTicketsPage />} />
        <Route path="/ai-assistant" element={<AiAssistantPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
