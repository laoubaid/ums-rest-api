
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from './pages/login';

function App() {
    return (
        <BrowserRouter>
            <div style={{ padding: '20px' }}>
                <nav style={{ marginBottom: '20px' }}>
                <Link to="/">Home</Link> |
                <Link to="/login">Login</Link> |
                <Link to="/register">Register</Link>
                </nav>

                <Routes>
                <Route path="/" element={<h1>Welcome</h1>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<h1>Register Page</h1>} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App;
