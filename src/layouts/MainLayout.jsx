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
  const [upcomingTasksIds, setUpcomingTasksIds] = useState([]);
  const [audio] = useState(new Audio('/notification.mp3'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [notificationSilenced, setNotificationSilenced] = useState(false);
  const [viewedTasksIds, setViewedTasksIds] = useState([]);

  const isNotificationsPage = location.pathname === '/admin/notifications';

  // Silence notifications when visiting the notifications page
  useEffect(() => {
    if (isNotificationsPage && hasUpcomingTasks) {
      // Mark current task IDs as viewed
      setViewedTasksIds(prevViewed => {
        const newViewed = [...prevViewed];
        upcomingTasksIds.forEach(id => {
          if (!newViewed.includes(id)) {
            newViewed.push(id);
          }
        });
        return newViewed;
      });
      
      // Silence current notifications
      setNotificationSilenced(true);
    }
  }, [isNotificationsPage, hasUpcomingTasks, upcomingTasksIds]);

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
      collection(db, 'tarefas_por_horario'),
      where('status', '!=', 'Finalizada')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const now = new Date();
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

      // Track upcoming task IDs and new upcoming tasks
      const currentUpcomingTaskIds = [];
      let hasNewUpcomingTasks = false;

      const hasUpcoming = tasks.some(task => {
        if (!task.horario || !task.diasDaSemana) return false;

        const [hours, minutes] = task.horario.split(':');
        const taskTime = new Date();
        taskTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

        const diffInMinutes = Math.floor((taskTime - now) / (1000 * 60));
        
        // Check if the task is scheduled for today and coming up within the next 10 minutes
        const isUpcoming = task.diasDaSemana.includes(dayMapping[currentDay]) && 
               diffInMinutes >= 0 && 
               diffInMinutes <= 10;
        
        if (isUpcoming) {
          currentUpcomingTaskIds.push(task.id);
          
          // Check if this task has not been viewed before
          if (!viewedTasksIds.includes(task.id)) {
            hasNewUpcomingTasks = true;
          }
        }
        
        return isUpcoming;
      });

      setUpcomingTasksIds(currentUpcomingTaskIds);

      // If there are new upcoming tasks that haven't been viewed
      if (hasUpcoming) {
        setHasUpcomingTasks(true);
        
        // Un-silence only if there are new tasks that haven't been viewed
        if (hasNewUpcomingTasks) {
          setNotificationSilenced(false);
        }
      } else {
        setHasUpcomingTasks(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, viewedTasksIds]);

  // Handle sound effect
  useEffect(() => {
    let interval;
    // Only play sound if there are upcoming tasks, not on notifications page, and not silenced
    if (hasUpcomingTasks && !isNotificationsPage && !notificationSilenced) {
      setIsPlaying(true);
      audio.play().catch(error => console.error('Error playing sound:', error));
      
      // Restart sound every 30 seconds if notification is still active
      interval = setInterval(() => {
        if (hasUpcomingTasks && !isNotificationsPage && !notificationSilenced) {
          audio.play().catch(error => console.error('Error playing sound:', error));
        }
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }
    };
  }, [hasUpcomingTasks, audio, isNotificationsPage, notificationSilenced]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNotificationsClick = () => {
    // Mark current task IDs as viewed
    setViewedTasksIds(prevViewed => {
      const newViewed = [...prevViewed];
      upcomingTasksIds.forEach(id => {
        if (!newViewed.includes(id)) {
          newViewed.push(id);
        }
      });
      return newViewed;
    });
    
    setNotificationSilenced(true);
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
              sx={hasUpcomingTasks && !isNotificationsPage && !notificationSilenced ? {
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