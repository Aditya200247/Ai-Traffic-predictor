import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInAnonymously, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';

// --- MOCK MAP COMPONENTS (to prevent compilation errors in this environment) ---
const ReactMapGL = ({ children, ...props }) => <div style={{...props.style, width: '100%', height: '100%', backgroundColor: '#1c1c1e', position: 'relative', overflow: 'hidden'}}>{children}</div>;
const Marker = ({ children, longitude, latitude }) => <div style={{position: 'absolute', left: `${longitude}%`, top: `${latitude}%`, transform: 'translate(-50%, -50%)'}}>{children}</div>;
const Source = ({ children }) => <>{children}</>;
const Layer = ({ paint }) => <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: `3px dashed ${paint?.['line-color'] || '#fff'}`, borderRadius: '15px', opacity: 0.7}} />;

// --- IMPORTANT SETUP ---
const MAPBOX_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN'; // Replace with your actual token to see the real map
const API_URL = 'http://127.0.0.1:5000/predict'; // URL for your local Python ML server
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "demo", authDomain: "demo.firebaseapp.com" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- MOCK DATA & SIMULATIONS ---
const useMockWeather = () => {
    return useMemo(() => ({
        location: 'Indore, MP',
        temp: 31,
        condition: 'Hazy Sun',
        icon: '🌤️'
    }), []);
};

const mockAlerts = [
    { id: 1, type: 'alert', title: 'Heavy Congestion', message: 'Accident reported near Vijay Nagar Square.', time: '5m ago' },
    { id: 2, type: 'info', title: 'Road Closure', message: 'BRTS corridor closed for maintenance from 11 PM to 5 AM.', time: '1h ago' },
    { id: 3, type: 'reward', title: 'Eco-Driver Bonus!', message: 'You earned 50 points for choosing an eco-friendly route.', time: '3h ago' }
];

const mockRewards = {
    points: 1250,
    level: 'Gold',
    leaderboard: [
        { rank: 1, name: 'Aarav S.', points: 1820 },
        { rank: 2, name: 'You', points: 1250 },
        { rank: 3, name: 'Priya M.', points: 1190 }
    ]
};

// --- SVG ICONS ---
const ICONS = {
    MapPin: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Compass: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>,
    Bell: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
    Settings: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    LogOut: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    Car: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><path d="M14 16.5V14a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v2.5M3 14h18M5 14V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"></path><line x1="6" y1="19" x2="6.01" y2="19"></line><line x1="18" y1="19" x2="18.01" y2="19"></line></svg>,
    Zap: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
    Leaf: ({ className }) => <svg className={className} style={styles.icon} viewBox="0 0 24 24"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15.5" x2="9.5" y2="7.5"></line></svg>,
};

// --- LOGIN SCREEN ---
const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (type) => {
        setLoading(true);
        setError('');
        try {
            if (type === 'guest') await signInAnonymously(auth);
            else if (type === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.loginContainer}>
            <div style={styles.card}>
                <h1 style={styles.splashTitle}>SmartMove</h1>
                <p style={styles.splashTagline}>AI for Smarter Traffic</p>
                <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address"/>
                <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/>
                {error && <p style={styles.errorText}>{error}</p>}
                <div style={styles.buttonGroup}>
                    <button onClick={() => handleLogin('login')} disabled={loading} style={{...styles.button, ...styles.buttonPrimary, flex: 1}}>{loading ? '...' : 'Login'}</button>
                    <button onClick={() => handleLogin('signup')} disabled={loading} style={{...styles.button, flex: 1}}>Sign Up</button>
                </div>
                <button onClick={() => handleLogin('guest')} disabled={loading} style={styles.guestButton}>Continue as Guest</button>
            </div>
        </div>
    );
};

// --- MAIN APPLICATION ---
const AppContent = ({ user }) => {
    const [currentScreen, setCurrentScreen] = useState('Dashboard');
    const weather = useMockWeather();

    const renderScreen = () => {
        switch (currentScreen) {
            case 'Dashboard': return <LiveTrafficDashboard user={user} weather={weather} />;
            case 'Routes': return <RouteOptimizationScreen />;
            case 'Alerts': return <AlertsAndRewardsScreen />;
            case 'Settings': return <SettingsScreen user={user} />;
            default: return <LiveTrafficDashboard user={user} weather={weather} />;
        }
    };
    
    return (
        <div style={styles.appContainer}>
            <main style={styles.content}>
                {renderScreen()}
            </main>
            <nav style={styles.navBar}>
                <NavButton name="Dashboard" icon="MapPin" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
                <NavButton name="Routes" icon="Compass" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
                <NavButton name="Alerts" icon="Bell" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
                <NavButton name="Settings" icon="Settings" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            </nav>
        </div>
    );
};

// --- Screen Components ---

const LiveTrafficDashboard = ({ user, weather }) => {
    const [viewport, setViewport] = useState({ latitude: 22.7196, longitude: 75.8577, zoom: 12 });
    return (
        <div style={styles.screen}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.screenTitle}>Dashboard</h1>
                    <p style={styles.screenSubtitle}>Welcome, {user.isAnonymous ? 'Guest' : user.email.split('@')[0]}</p>
                </div>
                <div style={styles.weatherWidget}>
                    <span>{weather.icon}</span>
                    <div>
                        <strong>{weather.temp}°C</strong>
                        <small>{weather.location}</small>
                    </div>
                </div>
            </header>
            <div style={{...styles.mapContainer, height: '60%'}}>
                <ReactMapGL {...viewport} mapStyle="mapbox://styles/mapbox/dark-v10">
                    <Marker longitude={75.86} latitude={22.72}><div style={{...styles.mapMarker, backgroundColor: '#34C759'}}></div></Marker>
                    <Marker longitude={75.89} latitude={22.75}><div style={{...styles.mapMarker, backgroundColor: '#FF9500'}}></div></Marker>
                    <Marker longitude={75.88} latitude={22.73}><div style={{...styles.mapMarker, backgroundColor: '#FF3B30'}}></div></Marker>
                </ReactMapGL>
            </div>
            <div style={styles.quickActions}>
                <h3 style={styles.sectionTitle}>Quick Actions</h3>
                <button style={{...styles.button, ...styles.buttonPrimary}}>Report Traffic Issue</button>
            </div>
        </div>
    );
};

const RouteOptimizationScreen = () => {
    const [from, setFrom] = useState('Vijay Nagar Square');
    const [to, setTo] = useState('Rajwada Palace');
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);

    const findRoutes = () => {
        setLoading(true);
        setSelectedRoute(null);
        setTimeout(() => {
            setRoutes([
                { id: 'fastest', name: 'Fastest Route', icon: 'Zap', color: '#007AFF', distance: '8.2 km', time: '22 min', congestion: 0.8, coords: {start: {lat: 22.75, lon: 75.89}, end: {lat: 22.72, lon: 75.85}} },
                { id: 'balanced', name: 'Balanced Load', icon: 'Car', color: '#34C759', distance: '9.1 km', time: '25 min', congestion: 0.5, coords: {start: {lat: 22.75, lon: 75.89}, end: {lat: 22.72, lon: 75.85}} },
                { id: 'eco', name: 'Eco Route', icon: 'Leaf', color: '#5856D6', distance: '8.8 km', time: '28 min', congestion: 0.3, coords: {start: {lat: 22.75, lon: 75.89}, end: {lat: 22.72, lon: 75.85}} },
            ]);
            setLoading(false);
        }, 1500);
    };

    return (
        <div style={styles.screen}>
            <h1 style={styles.screenTitle}>Route Planner</h1>
            <div style={styles.routeForm}>
                <input style={styles.input} type="text" value={from} onChange={e => setFrom(e.target.value)} />
                <input style={styles.input} type="text" value={to} onChange={e => setTo(e.target.value)} />
                <button onClick={findRoutes} disabled={loading} style={{...styles.button, ...styles.buttonPrimary, width: '100%'}}>
                    {loading ? 'Analyzing...' : 'Find Routes'}
                </button>
            </div>
            <div style={{...styles.mapContainer, height: '40%'}}>
                 <ReactMapGL latitude={22.73} longitude={75.87} zoom={12.5} style={{width:'100%', height:'100%'}}>
                     {selectedRoute && <>
                        <Marker longitude={selectedRoute.coords.start.lon * 100/100} latitude={selectedRoute.coords.start.lat * 100/100}><div style={{...styles.routeMarker, background: selectedRoute.color}}>S</div></Marker>
                        <Marker longitude={selectedRoute.coords.end.lon*100/100} latitude={selectedRoute.coords.end.lat*100/100}><div style={{...styles.routeMarker, background: selectedRoute.color}}>E</div></Marker>
                        <Source><Layer paint={{'line-color': selectedRoute.color}} /></Source>
                     </>}
                 </ReactMapGL>
            </div>
            <div style={styles.routeList}>
                {routes.map(route => <RouteCard key={route.id} route={route} onSelect={() => setSelectedRoute(route)} selected={selectedRoute?.id === route.id} />)}
            </div>
        </div>
    );
};

const AlertsAndRewardsScreen = () => {
    return (
        <div style={{...styles.screen, paddingBottom: '80px'}}>
            <h1 style={styles.screenTitle}>Alerts & Rewards</h1>
            <div style={styles.card}>
                <h3 style={styles.sectionTitle}>Your Points</h3>
                <p style={styles.pointsText}>{mockRewards.points} <span style={{color: '#8A8A8E', fontSize: 18}}>pts</span></p>
                <p style={{margin: 0, color: '#34C759'}}>You are in the {mockRewards.level} tier!</p>
            </div>
            
            <h3 style={{...styles.sectionTitle, marginTop: '24px'}}>Recent Notifications</h3>
            {mockAlerts.map(alert => (
                <div key={alert.id} style={styles.alertItem}>
                    <span style={{fontSize: 20}}>{alert.type === 'alert' ? '⚠️' : alert.type === 'info' ? 'ℹ️' : '🏆'}</span>
                    <div>
                        <strong>{alert.title}</strong>
                        <p style={{margin: 0, color: '#8A8A8E'}}>{alert.message}</p>
                    </div>
                    <small style={{marginLeft: 'auto', color: '#8A8A8E'}}>{alert.time}</small>
                </div>
            ))}
        </div>
    );
};

const SettingsScreen = ({ user }) => (
    <div style={styles.screen}>
        <h1 style={styles.screenTitle}>Settings</h1>
        <div style={styles.card}>
            <p><strong>Email:</strong> {user.isAnonymous ? 'Guest User' : user.email}</p>
            <p><strong>User ID:</strong> {user.uid.substring(0, 15)}...</p>
        </div>
        <button onClick={() => signOut(auth)} style={{...styles.button, ...styles.buttonDanger, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            <ICONS.LogOut className="icon" /> Sign Out
        </button>
    </div>
);


// --- Reusable Components ---
const NavButton = ({ name, icon, currentScreen, setCurrentScreen }) => {
    const Icon = ICONS[icon];
    const isActive = currentScreen === name;
    return (
        <button style={{...styles.navButton, ...(isActive ? styles.navButtonActive : {})}} onClick={() => setCurrentScreen(name)}>
            <Icon className="icon" />
            <span style={styles.navText}>{name}</span>
        </button>
    );
};

const RouteCard = ({ route, onSelect, selected }) => {
    const Icon = ICONS[route.icon];
    return (
        <div onClick={onSelect} style={{...styles.routeCard, ...(selected ? {borderColor: route.color, backgroundColor: `${route.color}15`} : {})}}>
            <Icon className="icon" style={{color: route.color}}/>
            <div style={{flex: 1}}>
                <strong>{route.name}</strong>
                <p style={{margin: 0, color: '#3c3c43'}}>{route.distance} • {route.time}</p>
            </div>
            <div style={{textAlign: 'right'}}>
                <strong>Congestion</strong>
                <p style={{margin: 0, color: route.color}}>{(route.congestion * 100).toFixed(0)}%</p>
            </div>
        </div>
    );
};

// --- Main App Entry Point ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div style={styles.fullScreenLoader}><div>Loading...</div></div>;
    }

    return user ? <AppContent user={user} /> : <LoginScreen />;
}

// --- STYLESHEET ---
const styles = {
    // Global
    appContainer: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
    content: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
    screen: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px'},
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    screenTitle: { fontSize: 28, fontWeight: '700', color: '#1c1c1e', margin: 0 },
    screenSubtitle: { fontSize: 16, color: '#8A8A8E', margin: '4px 0 0 0' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1c1c1e', margin: '8px 0' },
    card: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    input: { boxSizing: 'border-box', width: '100%', backgroundColor: '#f0f2f5', padding: '12px', borderRadius: '8px', border: '1px solid #e1e4e8', fontSize: '16px' },
    button: { cursor: 'pointer', border: '1px solid #d1d5da', backgroundColor: '#f6f8fa', color: '#24292e', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease' },
    buttonPrimary: { backgroundColor: '#007AFF', color: '#fff', border: 'none' },
    buttonDanger: { backgroundColor: '#FF3B30', color: '#fff', border: 'none' },
    buttonGroup: { display: 'flex', gap: '10px', marginTop: '10px' },
    icon: { width: '24px', height: '24px', strokeWidth: '2', fill: 'none', stroke: 'currentColor' },
    // Login
    loginContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #007AFF, #00C6FF)' },
    splashTitle: { fontSize: 48, fontWeight: 'bold', color: '#1c1c1e', margin: 0, textAlign: 'center' },
    splashTagline: { fontSize: 18, color: '#8A8A8E', marginTop: 8, marginBottom: 30, textAlign: 'center' },
    errorText: { color: '#FF3B30', marginTop: '10px', textAlign: 'center' },
    guestButton: { cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#8A8A8E', marginTop: '20px', fontSize: '14px', width: '100%' },
    fullScreenLoader: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#8A8A8E' },
    // Dashboard
    weatherWidget: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    mapContainer: { flex: 1, minHeight: '300px', backgroundColor: '#D1D1D6', borderRadius: '18px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    mapMarker: { width: '18px', height: '18px', borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' },
    quickActions: { marginTop: 'auto' },
    // Route Optimization
    routeForm: { display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '16px' },
    routeList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
    routeCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '10px', border: '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s ease' },
    routeMarker: { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px' },
    // Alerts & Rewards
    pointsText: { fontSize: '36px', fontWeight: '700', color: '#1c1c1e', margin: 0 },
    alertItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', backgroundColor: '#fff', borderRadius: '10px' },
    // Nav Bar
    navBar: { display: 'flex', height: '65px', backgroundColor: 'rgba(255,255,255,0.8)', borderTop: '1px solid #e1e4e8', backdropFilter: 'blur(10px)', position: 'sticky', bottom: 0 },
    navButton: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A8E' },
    navButtonActive: { color: '#007AFF' },
    navText: { fontSize: '11px', fontWeight: '500' },
};
