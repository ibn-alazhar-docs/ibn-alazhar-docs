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
  Trash2,
  Edit,
  Menu,
  Home,
  Info,
  LogOut,
} from "lucide-react";

export interface IconProps {
  className?: string;
}

export function UploadIcon({ className = "h-5 w-5" }: IconProps) {
  return <Upload className={className} />;
}
export function ScanIcon({ className = "h-5 w-5" }: IconProps) {
  return <Scan className={className} />;
}
export function ExportIcon({ className = "h-5 w-5" }: IconProps) {
  return <Download className={className} />;
}
export function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return <Shield className={className} />;
}
export function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return <Check className={className} />;
}
export function FolderIcon({ className = "h-5 w-5" }: IconProps) {
  return <Folder className={className} />;
}
export function FileTextIcon({ className = "h-5 w-5" }: IconProps) {
  return <FileText className={className} />;
}
export function EyeIcon({ className = "h-5 w-5" }: IconProps) {
  return <Eye className={className} />;
}
export function GearIcon({ className = "h-5 w-5" }: IconProps) {
  return <Settings className={className} />;
}
export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return <Search className={className} />;
}
export function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return <X className={className} />;
}
export function ChevronLeftIcon({ className = "h-5 w-5" }: IconProps) {
  return <ChevronLeft className={className} />;
}
export function ChevronRightIcon({ className = "h-5 w-5" }: IconProps) {
  return <ChevronRight className={className} />;
}
export function UserIcon({ className = "h-5 w-5" }: IconProps) {
  return <User className={className} />;
}
export function TagIcon({ className = "h-5 w-5" }: IconProps) {
  return <Tag className={className} />;
}
export function TrashIcon({ className = "h-5 w-5" }: IconProps) {
  return <Trash2 className={className} />;
}
export function EditIcon({ className = "h-5 w-5" }: IconProps) {
  return <Edit className={className} />;
}
export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return <Menu className={className} />;
}
export function HomeIcon({ className = "h-5 w-5" }: IconProps) {
  return <Home className={className} />;
}
export function InfoIcon({ className = "h-5 w-5" }: IconProps) {
  return <Info className={className} />;
}
export function LogoutIcon({ className = "h-5 w-5" }: IconProps) {
  return <LogOut className={className} />;
}
