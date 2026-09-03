import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AdminLayout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CaseList from './pages/cases/CaseList'
import CaseEdit from './pages/cases/CaseEdit'
import VideoList from './pages/videos/VideoList'
import VideoEdit from './pages/videos/VideoEdit'
import NewsList from './pages/news/NewsList'
import NewsEdit from './pages/news/NewsEdit'
import ServiceList from './pages/services/ServiceList'
import ServiceEdit from './pages/services/ServiceEdit'
import CategoryList from './pages/categories/CategoryList'
import BannerList from './pages/banners/BannerList'
import ContactList from './pages/contacts/ContactList'
import SettingPage from './pages/settings/SettingPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn())
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cases" element={<CaseList />} />
                <Route path="/cases/new" element={<CaseEdit />} />
                <Route path="/cases/edit/:id" element={<CaseEdit />} />
                <Route path="/videos" element={<VideoList />} />
                <Route path="/videos/new" element={<VideoEdit />} />
                <Route path="/videos/edit/:id" element={<VideoEdit />} />
                <Route path="/news" element={<NewsList />} />
                <Route path="/news/new" element={<NewsEdit />} />
                <Route path="/news/edit/:id" element={<NewsEdit />} />
                <Route path="/services" element={<ServiceList />} />
                <Route path="/services/new" element={<ServiceEdit />} />
                <Route path="/services/edit/:id" element={<ServiceEdit />} />
                <Route path="/categories" element={<CategoryList />} />
                <Route path="/banners" element={<BannerList />} />
                <Route path="/contacts" element={<ContactList />} />
                <Route path="/settings" element={<SettingPage />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
