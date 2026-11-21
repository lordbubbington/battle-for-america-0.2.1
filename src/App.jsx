import { Toaster } from '@/components/ui/toaster';
import { Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App
