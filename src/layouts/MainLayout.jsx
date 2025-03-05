import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  keyframes
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from '../components/Sidebar';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const drawerWidth = 240;

// Define the shake animation
const shakeAnimation = keyframes`
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
`;

export default function MainLayout({ children, title }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');
  const [hasUpcomingTasks, setHasUpcomingTasks] = useState(false);
  const [audio] = useState(new Audio('/notification.mp3'));
  const [isPlaying, setIsPlaying] = useState(false);

  const isNotificationsPage = location.pathname === '/admin/notifications';

  useEffect(() => {
    const fetchUserName = async () => {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || currentUser.email);
          } else {
            setUserName(currentUser.email);
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
          setUserName(currentUser.email);
        }
      }
    };

    fetchUserName();
  }, [currentUser]);

  // Monitor upcoming tasks
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'tarefas'),
      where('tipo', '==', 'por_horario'),
      where('status', '!=', 'Finalizada')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const hasUpcoming = tasks.some(task => {
        if (!task.horario || !task.diasSemana) return false;

        const now = new Date();
        const [hours, minutes] = task.horario.split(':');
        const taskTime = new Date();
        taskTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

        const diffInMinutes = Math.floor((taskTime - now) / (1000 * 60));
        const currentDay = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
        
        const dayMapping = {
          'segunda-feira': 'segunda',
          'terça-feira': 'terca',
          'quarta-feira': 'quarta',
          'quinta-feira': 'quinta',
          'sexta-feira': 'sexta',
          'sábado': 'sabado',
          'domingo': 'domingo'
        };

        return task.diasSemana.includes(dayMapping[currentDay]) && diffInMinutes > 0 && diffInMinutes <= 10;
      });

      setHasUpcomingTasks(hasUpcoming);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle sound effect
  useEffect(() => {
    let interval;
    if (hasUpcomingTasks && !isPlaying && !isNotificationsPage) {
      setIsPlaying(true);
      audio.loop = true;
      audio.play().catch(error => console.error('Error playing sound:', error));
      
      // Restart sound every 30 seconds if it stops
      interval = setInterval(() => {
        if (!audio.playing) {
          audio.play().catch(error => console.error('Error playing sound:', error));
        }
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (isPlaying) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }
    };
  }, [hasUpcomingTasks, audio, isPlaying, isNotificationsPage]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNotificationsClick = () => {
    setHasUpcomingTasks(false);
    navigate('/admin/notifications');
  };

  return (
    <Box sx={{ 
      display: 'flex',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      width: '100vw'
    }}>
      <AppBar
        position="fixed"
        sx={{ 
          width: isSidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%', 
          ml: isSidebarOpen ? `${drawerWidth}px` : 0,
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              onClick={handleToggleSidebar}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {userName}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleNotificationsClick}
              size="large"
              aria-label="show notifications"
              sx={hasUpcomingTasks && !isNotificationsPage ? {
                animation: `${shakeAnimation} 0.5s infinite`,
                '&:hover': {
                  animation: 'none'
                }
              } : {}}
            >
              <Badge color="error" variant={hasUpcomingTasks ? "dot" : "standard"}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              size="small"
            >
              LOGOUT
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Sidebar open={isSidebarOpen} onClose={handleToggleSidebar} />

      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3,
          ml: isSidebarOpen ? 0 : `-${drawerWidth}px`,
          width: isSidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          transition: theme => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
} 