import {
  Upload,
  Scan,
  Download,
  Shield,
  Check,
  Folder,
  FileText,
  Eye,
  Settings,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
  Tags,
  Trash2,
  Edit,
  Menu,
  Home,
  Info,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  BarChart3,
  HardDrive,
  TrendingUp,
  Sun,
  Moon,
  Link as LinkIconLucide,
  Share2,
  Clock,
  Globe,
  Image as LucideImage,
} from "lucide-react";

export interface IconProps {
  className?: string;
  size?: number;
}

export function UploadIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Upload className={className} size={size} />;
}
export function ScanIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Scan className={className} size={size} />;
}
export function ExportIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Download className={className} size={size} />;
}
export function ShieldIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Shield className={className} size={size} />;
}
export function CheckIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Check className={className} size={size} />;
}
export function FolderIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Folder className={className} size={size} />;
}
export function FileTextIcon({ className = "h-5 w-5", size }: IconProps) {
  return <FileText className={className} size={size} />;
}
export function EyeIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Eye className={className} size={size} />;
}
export function GearIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Settings className={className} size={size} />;
}
export function SearchIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Search className={className} size={size} />;
}
export function CloseIcon({ className = "h-5 w-5", size }: IconProps) {
  return <X className={className} size={size} />;
}
export function ChevronLeftIcon({ className = "h-5 w-5", size }: IconProps) {
  return <ChevronLeft className={className} size={size} />;
}
export function ChevronRightIcon({ className = "h-5 w-5", size }: IconProps) {
  return <ChevronRight className={className} size={size} />;
}
export function UserIcon({ className = "h-5 w-5", size }: IconProps) {
  return <User className={className} size={size} />;
}
export function TagIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Tag className={className} size={size} />;
}
export function TrashIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Trash2 className={className} size={size} />;
}
export function EditIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Edit className={className} size={size} />;
}
export function MenuIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Menu className={className} size={size} />;
}
export function HomeIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Home className={className} size={size} />;
}
export function InfoIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Info className={className} size={size} />;
}
export function LogoutIcon({ className = "h-5 w-5", size }: IconProps) {
  return <LogOut className={className} size={size} />;
}
export function ArrowLeftIcon({ className = "h-5 w-5", size }: IconProps) {
  return <ArrowLeft className={className} size={size} />;
}
export function ArrowRightIcon({ className = "h-5 w-5", size }: IconProps) {
  return <ArrowRight className={className} size={size} />;
}
export function BookmarkIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Bookmark className={className} size={size} />;
}
export function RefreshIcon({ className = "h-5 w-5", size }: IconProps) {
  return <RefreshCw className={className} size={size} />;
}
export function BarChartIcon({ className = "h-5 w-5", size }: IconProps) {
  return <BarChart3 className={className} size={size} />;
}
export function ImageIcon({ className = "h-5 w-5", size }: IconProps) {
  return <LucideImage className={className} size={size} />;
}
export function TagsIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Tags className={className} size={size} />;
}
export function BookmarkCheckIcon({ className = "h-5 w-5", size }: IconProps) {
  return <BookmarkCheck className={className} size={size} />;
}
export function HardDriveIcon({ className = "h-5 w-5", size }: IconProps) {
  return <HardDrive className={className} size={size} />;
}
export function TrendingUpIcon({ className = "h-5 w-5", size }: IconProps) {
  return <TrendingUp className={className} size={size} />;
}
export function SunIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Sun className={className} size={size} />;
}
export function MoonIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Moon className={className} size={size} />;
}
export function LinkIcon({ className = "h-5 w-5", size }: IconProps) {
  return <LinkIconLucide className={className} size={size} />;
}
export function ShareIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Share2 className={className} size={size} />;
}
export function ClockIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Clock className={className} size={size} />;
}
export function GlobeIcon({ className = "h-5 w-5", size }: IconProps) {
  return <Globe className={className} size={size} />;
}
