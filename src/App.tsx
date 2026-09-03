import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ExtractReport from './pages/ExtractReport'
import ExtractionProgress from './pages/ExtractionProgress'
import ExtractionHistory from './pages/ExtractionHistory'
import ReportReview from './pages/ReportReview'
import UserGuide from './pages/UserGuide'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/extract" replace />} />
        <Route path="/extract" element={<ExtractReport />} />
        <Route path="/progress/:reportId" element={<ExtractionProgress />} />
        <Route path="/history" element={<ExtractionHistory />} />
        <Route path="/reports/:reportId" element={<ReportReview />} />
        <Route path="/guide" element={<UserGuide />} />
        <Route path="*" element={<Navigate to="/extract" replace />} />
      </Route>
    </Routes>
  )
}
