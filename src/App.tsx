import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network, 
  Store, 
  Activity, 
  Settings, 
  Search, 
  Bell, 
  HelpCircle, 
  ArrowRight, 
  Grid, 
  List,
  Terminal,
  Zap,
  ShieldCheck,
  Slack,
  Github,
  Cloud,
  Database,
  CreditCard,
  MessageSquare,
  Cpu,
  HardDrive,
  ChevronDown,
  LogIn,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  getDocs, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';

// --- Types ---
interface Integration {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  iconName: string;
  author?: string;
  website?: string;
  version?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-zinc-200">
            <div className="flex items-center gap-3 text-zinc-950 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-xl font-black tracking-tighter uppercase">Application Error</h2>
            </div>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              Something went wrong. This might be due to missing permissions or a configuration issue.
            </p>
            <pre className="bg-zinc-100 p-4 rounded-lg text-[10px] font-mono overflow-auto max-h-40 mb-6">
              {this.state.errorInfo}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-950 text-white py-3 rounded-md text-xs font-bold uppercase tracking-widest"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Icon Mapping ---
const ICON_MAP: Record<string, React.ReactNode> = {
  Slack: <Slack className="w-8 h-8" />,
  Github: <Github className="w-8 h-8" />,
  Cloud: <Cloud className="w-8 h-8" />,
  Database: <Database className="w-8 h-8" />,
  CreditCard: <CreditCard className="w-8 h-8" />,
  MessageSquare: <MessageSquare className="w-8 h-8" />,
  Cpu: <Cpu className="w-8 h-8" />,
  HardDrive: <HardDrive className="w-8 h-8" />,
};

const CATEGORIES = ['All Apps', 'CRM', 'Communication', 'Dev Tools', 'Financial', 'Productivity', 'Storage'];

const CATEGORY_MAP: Record<string, string> = {
  'Communication': 'COMM',
  'Dev Tools': 'DEV',
  'Financial': 'FINANCE',
  'CRM': 'CRM',
  'Productivity': 'PRODUCTIVITY',
  'Storage': 'STORAGE'
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <button className={`flex items-center gap-3 w-full px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-white text-zinc-950 shadow-sm rounded-md' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100/50'}`}>
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const Sidebar = ({ user }: { user: User | null }) => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col z-50">
    <div className="p-6">
      <h1 className="text-xl font-black tracking-tighter text-zinc-950 uppercase">OMISE</h1>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">Enterprise</p>
    </div>

    <nav className="flex-1 px-4 space-y-1 mt-4">
      <SidebarItem icon={LayoutDashboard} label="Dashboard" />
      <SidebarItem icon={Network} label="Scenarios" />
      <SidebarItem icon={Store} label="Marketplace" active />
      <SidebarItem icon={Activity} label="Executions" />
      <SidebarItem icon={Settings} label="Settings" />
    </nav>

    <div className="p-4 mt-auto border-t border-zinc-200">
      <button className="w-full bg-zinc-950 text-white py-2.5 rounded-md text-sm font-bold tracking-tight hover:bg-zinc-800 transition-colors">
        New Scenario
      </button>
      <div className="mt-6 flex items-center gap-3 px-2">
        {user ? (
          <>
            <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden">
              <img 
                src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                alt="User" 
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-xs font-bold text-zinc-950 truncate max-w-[120px]">{user.displayName || 'User'}</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">Admin</span>
            </div>
            <button onClick={() => signOut(auth)} className="text-zinc-400 hover:text-zinc-950">
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="flex items-center gap-2 text-xs font-bold text-zinc-950 hover:opacity-70 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </div>
  </aside>
);

const TopBar = () => (
  <header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex items-center justify-between px-8 z-40">
    <div className="flex items-center gap-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search integrations..." 
          className="pl-10 pr-4 py-1.5 bg-zinc-100 border-none rounded-md text-xs w-64 focus:ring-1 focus:ring-zinc-950 transition-all"
        />
      </div>
      <nav className="flex gap-6 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
        <a href="#" className="hover:text-zinc-950 transition-colors">Logs</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">History</a>
        <a href="#" className="hover:text-zinc-950 transition-colors">Variables</a>
      </nav>
    </div>

    <div className="flex items-center gap-4">
      <button className="p-2 text-zinc-400 hover:text-zinc-950 transition-colors">
        <Bell className="w-4 h-4" />
      </button>
      <button className="p-2 text-zinc-400 hover:text-zinc-950 transition-colors">
        <HelpCircle className="w-4 h-4" />
      </button>
      <div className="h-4 w-px bg-zinc-200 mx-2" />
      <button className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-zinc-950 transition-colors">
        Run Once
      </button>
      <button className="bg-zinc-950 text-white px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-black rounded shadow-md hover:scale-[0.98] transition-transform">
        Publish
      </button>
    </div>
  </header>
);

const FeaturedCard = () => (
  <div className="col-span-12 lg:col-span-8 bg-zinc-50 p-10 rounded-2xl border border-zinc-200 flex flex-col justify-between group cursor-pointer hover:bg-white hover:shadow-xl transition-all">
    <div>
      <div className="flex justify-between items-start mb-12">
        <div className="w-16 h-16 bg-zinc-200 rounded-xl flex items-center justify-center">
          <Terminal className="w-8 h-8 text-zinc-950" />
        </div>
        <span className="px-3 py-1 border border-zinc-200 text-[9px] font-mono uppercase tracking-widest text-zinc-400 rounded">Native</span>
      </div>
      <h3 className="text-3xl font-black tracking-tighter mb-4 text-zinc-950">Webhooks & API</h3>
      <p className="text-zinc-500 max-w-md leading-relaxed">
        The ultimate power tool. Connect any service that has an API endpoint with custom request logic and automated authentication handling.
      </p>
    </div>
    <div className="mt-12 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all">
      View Documentation <ArrowRight className="w-4 h-4" />
    </div>
  </div>
);

const SideCard = ({ icon: Icon, title, description, dark = false }: { icon: any, title: string, description: string, dark?: boolean }) => (
  <div className={`p-8 rounded-2xl flex flex-col justify-between h-full border ${dark ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-zinc-50 text-zinc-950 border-zinc-200'}`}>
    <Icon className={`w-8 h-8 ${dark ? 'text-white' : 'text-zinc-950'}`} />
    <div className="mt-8">
      <h4 className="text-lg font-bold mb-1">{title}</h4>
      <p className={`text-xs leading-snug ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{description}</p>
    </div>
  </div>
);

const IntegrationCard: React.FC<{ integration: Integration, onClick: () => void }> = ({ integration, onClick }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="group cursor-pointer"
    onClick={onClick}
  >
    <div className="aspect-square bg-zinc-50 mb-6 rounded-2xl flex items-center justify-center border border-zinc-100 transition-all group-hover:bg-white group-hover:shadow-xl group-hover:border-zinc-200">
      <div className="text-zinc-400 group-hover:text-zinc-950 transition-colors">
        {ICON_MAP[integration.iconName] || <Cpu className="w-8 h-8" />}
      </div>
    </div>
    <h4 className="font-bold text-lg mb-1 text-zinc-950">{integration.name}</h4>
    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{integration.description}</p>
    <div className="mt-4">
      <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded uppercase">{integration.category}</span>
    </div>
  </motion.div>
);

const IntegrationDetailModal = ({ integration, onClose }: { integration: Integration, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-48 bg-zinc-50 border-b border-zinc-100 flex items-center justify-center">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-950"
        >
          <ChevronDown className="w-6 h-6 rotate-90" />
        </button>
        <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-950">
          {ICON_MAP[integration.iconName] || <Cpu className="w-12 h-12" />}
        </div>
      </div>

      <div className="p-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-4xl font-black tracking-tighter text-zinc-950 uppercase">{integration.name}</h2>
              <span className="px-2 py-1 bg-zinc-100 text-[10px] font-mono font-bold text-zinc-400 rounded uppercase">v{integration.version || '1.0.0'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">{integration.category}</span>
              <span className="text-zinc-200">•</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">By {integration.author || 'OMISE Team'}</span>
            </div>
          </div>
          <button className="bg-zinc-950 text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-lg">
            Add to Scenario
          </button>
        </div>

        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-950 mb-4">Overview</h3>
            <p className="text-zinc-600 leading-relaxed text-sm mb-8 whitespace-pre-wrap">
              {integration.longDescription || integration.description}
            </p>
            
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-950 mb-4">Key Features</h3>
            <ul className="space-y-3">
              {['Real-time event synchronization', 'Secure OAuth 2.0 authentication', 'Automated error handling', 'Custom field mapping'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-4">
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Metadata</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] uppercase font-bold text-zinc-400 mb-1">Website</p>
                  <a href={integration.website || '#'} className="text-xs font-bold text-zinc-950 hover:underline truncate block">
                    {integration.website?.replace('https://', '') || 'omise.io/docs'}
                  </a>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-zinc-400 mb-1">Last Updated</p>
                  <p className="text-xs font-bold text-zinc-950">March 2026</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-zinc-400 mb-1">Security Rating</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < 4 ? 'bg-zinc-950' : 'bg-zinc-200'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

function Marketplace() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeCategory, setActiveCategory] = useState('All Apps');
  const [sortBy, setSortBy] = useState<'name' | 'category'>('name');
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const path = 'integrations';
    const q = query(collection(db, path), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Integration[];
      setIntegrations(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  const seedData = async () => {
    const initialData = [
      { 
        name: 'Slack', 
        description: 'Centralize communication and trigger notifications directly into channels.', 
        longDescription: 'Slack is a messaging app for business that connects people to the information they need. By bringing people together to work as one unified team, Slack transforms the way organizations communicate.\n\nWith the OMISE Slack integration, you can automate your workspace communication, trigger alerts based on complex logic, and create interactive bots that respond to user actions.',
        category: 'COMM', 
        iconName: 'Slack',
        author: 'Slack Technologies',
        website: 'https://slack.com',
        version: '2.4.1'
      },
      { 
        name: 'GitHub', 
        description: 'Automate PR approvals, issue tracking and CI/CD pipelines.', 
        longDescription: 'GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, and track bugs and features.\n\nOMISE provides deep integration with GitHub Actions and repository events, allowing you to build sophisticated DevOps workflows without writing a single line of boilerplate code.',
        category: 'DEV', 
        iconName: 'Github',
        author: 'GitHub, Inc.',
        website: 'https://github.com',
        version: '1.8.0'
      },
      { 
        name: 'Salesforce', 
        description: 'Sync leads, update opportunities, and manage customer life cycles.', 
        longDescription: 'Salesforce is the world’s #1 customer relationship management (CRM) platform. We help your marketing, sales, commerce, service and IT teams work as one from anywhere—so you can keep your customers happy everywhere.\n\nConnect OMISE to Salesforce to automate lead routing, sync customer data across your stack, and trigger business processes based on CRM events.',
        category: 'CRM', 
        iconName: 'Cloud',
        author: 'Salesforce.com',
        website: 'https://salesforce.com',
        version: '5.2.0'
      },
      { 
        name: 'Notion', 
        description: 'Automatically populate databases and generate workspace pages.', 
        longDescription: 'Notion is a single space where you can think, write, and plan. Capture thoughts, manage projects, or even run an entire company — and do it exactly the way you want.\n\nUse OMISE to turn Notion into a powerful automated database. Sync tasks, generate reports, and keep your documentation up to date automatically.',
        category: 'PRODUCTIVITY', 
        iconName: 'Database',
        author: 'Notion Labs',
        website: 'https://notion.so',
        version: '2.1.0'
      },
      { 
        name: 'Stripe', 
        description: 'Listen for payment events and automate financial reconciliation.', 
        longDescription: 'Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses of all sizes. Accept payments and manage your business online.\n\nOMISE + Stripe allows you to automate your entire billing cycle. From subscription management to invoice generation and payment reconciliation.',
        category: 'FINANCE', 
        iconName: 'CreditCard',
        author: 'Stripe, Inc.',
        website: 'https://stripe.com',
        version: '3.0.5'
      },
      { 
        name: 'Discord', 
        description: 'Build custom community bots and manage role assignments automatically.', 
        longDescription: 'Discord is the easiest way to talk over voice, video, and text. Talk, chat, hang out, and stay close with your friends and communities.\n\nBuild powerful community management tools with OMISE. Automate role assignments, moderate content, and bridge your Discord server with other professional tools.',
        category: 'COMM', 
        iconName: 'MessageSquare',
        author: 'Discord Inc.',
        website: 'https://discord.com',
        version: '1.2.2'
      },
      { 
        name: 'AWS Lambda', 
        description: 'Trigger serverless functions from any event in the OMISE cloud.', 
        longDescription: 'AWS Lambda is a serverless, event-driven compute service that lets you run code for virtually any type of application or backend service without provisioning or managing servers.\n\nExtend OMISE with custom code. Trigger Lambda functions directly from your scenarios to handle complex data processing or custom integrations.',
        category: 'DEV', 
        iconName: 'Cpu',
        author: 'Amazon Web Services',
        website: 'https://aws.amazon.com',
        version: '4.0.0'
      },
      { 
        name: 'Google Drive', 
        description: 'Cloud storage automation and document processing workflows.', 
        longDescription: 'Google Drive is a file storage and synchronization service developed by Google. It allows users to store files on their servers, synchronize files across devices, and share files.\n\nAutomate your document management. Upload files, organize folders, and process documents as they arrive in your drive.',
        category: 'STORAGE', 
        iconName: 'HardDrive',
        author: 'Google LLC',
        website: 'https://google.com/drive',
        version: '2.3.0'
      },
    ];

    try {
      const snapshot = await getDocs(collection(db, 'integrations'));
      if (snapshot.empty) {
        for (const item of initialData) {
          await addDoc(collection(db, 'integrations'), item);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'integrations');
    }
  };

  const filteredAndSortedIntegrations = [...integrations]
    .filter(item => {
      if (activeCategory === 'All Apps') return true;
      return item.category === CATEGORY_MAP[activeCategory];
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.category.localeCompare(b.category);
      }
    });

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-zinc-950 selection:text-white">
      <Sidebar user={user} />
      <TopBar />

      <main className="ml-64 pt-16">
        <div className="max-w-7xl mx-auto px-12 py-16">
          
          {/* Hero Section */}
          <section className="mb-20">
            <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-400 mb-4">Integration Catalog</h2>
            <h1 className="text-7xl font-black tracking-tighter text-zinc-950 max-w-3xl leading-[0.9]">
              Connect your stack with OMISE.
            </h1>
            
            <div className="mt-10 flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all ${activeCategory === cat ? 'bg-zinc-950 text-white shadow-lg' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Featured Section */}
          <section className="grid grid-cols-12 gap-8 mb-24">
            <FeaturedCard />
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <SideCard 
                icon={Zap} 
                title="Instant Triggers" 
                description="Zero-latency event processing for real-time mission critical systems." 
                dark 
              />
              <SideCard 
                icon={ShieldCheck} 
                title="OAuth 2.0 Vault" 
                description="Securely manage and refresh credentials for your entire organization." 
              />
            </div>
          </section>

          {/* Available Tools Grid */}
          <section>
            <div className="flex justify-between items-end mb-12">
              <div>
                <h3 className="text-xs font-mono tracking-tighter text-zinc-400 mb-1">DIRECTORY_LIST_V2</h3>
                <h2 className="text-4xl font-black tracking-tighter uppercase text-zinc-950">Available Tools</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'category')}
                    className="appearance-none bg-zinc-100 border-none rounded-md px-4 py-2 pr-10 text-[10px] uppercase tracking-widest font-bold text-zinc-950 focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="category">Sort by Category</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
                    <Grid className="w-4 h-4 text-zinc-950" />
                  </button>
                  <button className="p-2.5 text-zinc-400 hover:text-zinc-950 transition-colors">
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-zinc-100 mb-6 rounded-2xl" />
                    <div className="h-4 bg-zinc-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-zinc-100 rounded w-full mb-1" />
                    <div className="h-3 bg-zinc-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : integrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 rounded-3xl">
                <p className="text-zinc-400 text-sm mb-6">No integrations found in the cloud.</p>
                <button 
                  onClick={seedData}
                  className="bg-zinc-950 text-white px-6 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest"
                >
                  Seed Initial Data
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                {filteredAndSortedIntegrations.map(item => (
                  <IntegrationCard 
                    key={item.id} 
                    integration={item} 
                    onClick={() => setSelectedIntegration(item)}
                  />
                ))}
              </div>
            )}

            {/* Integration Detail Modal */}
            <AnimatePresence>
              {selectedIntegration && (
                <IntegrationDetailModal 
                  integration={selectedIntegration} 
                  onClose={() => setSelectedIntegration(null)} 
                />
              )}
            </AnimatePresence>

            <div className="mt-24 pt-12 border-t border-zinc-100 flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-6 font-bold">
                Showing {filteredAndSortedIntegrations.length} of {integrations.length} integrations
              </p>
              <button className="px-10 py-3 bg-white border border-zinc-200 text-[10px] uppercase tracking-widest font-black hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all shadow-sm">
                Load More Applications
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-zinc-50 py-16 px-12 border-t border-zinc-100">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-8">
              <span className="text-2xl font-black tracking-tighter text-zinc-950 opacity-20">OMISE</span>
              <nav className="flex gap-6 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                <a href="#" className="hover:text-zinc-950 transition-colors">Legal</a>
                <a href="#" className="hover:text-zinc-950 transition-colors">Privacy</a>
                <a href="#" className="hover:text-zinc-950 transition-colors">Developer Portal</a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-zinc-950 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Systems Operational</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Marketplace />
    </ErrorBoundary>
  );
}
