#!/usr/bin/env bash

# Ibn Al-Azhar Docs Management Script
# Arabic-first helper to make running the project via Docker super simple.

# Colors for output
GREEN='\033[0;32m'
GOLD='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Docker is installed
check_docker() {
  if ! [ -x "$(command -v docker)" ]; then
    echo -e "${RED}❌ خطأ: Docker غير مثبت على هذا الجهاز. يرجى تثبيته أولاً.${NC}"
    exit 1
  fi
}

show_help() {
  echo -e "${GREEN}✨ مشروع ابن الأزهر لخدمات معالجة المستندات — Ibn Al-Azhar Docs ✨${NC}"
  echo -e "طريقة الاستخدام: ${GOLD}./ibn.sh [الأمر]${NC}\n"
  echo -e "الأوامر المتاحة:"
  echo -e "  ${CYAN}start${NC}      - تشغيل المشروع بالكامل في الخلفية (سيرفر الويب، قاعدة البيانات، والـ Workers)"
  echo -e "  ${CYAN}stop${NC}       - إيقاف تشغيل جميع الحاويات"
  echo -e "  ${CYAN}restart${NC}    - إعادة تشغيل كافة الخدمات"
  echo -e "  ${CYAN}status${NC}     - فحص حالة الخدمات للتأكد من أنها تعمل بشكل سليم (Healthy)"
  echo -e "  ${CYAN}logs${NC}       - عرض السجلات (Logs) لجميع الخدمات"
  echo -e "  ${CYAN}logs-web${NC}   - عرض سجلات سيرفر الويب (Next.js)"
  echo -e "  ${CYAN}logs-ocr${NC}   - عرض سجلات معالج النصوص (OCR Worker)"
  echo -e "  ${CYAN}clean${NC}      - إيقاف الخدمات وحذف جميع البيانات والملفات لبدء قاعدة بيانات نظيفة تماماً"
  echo -e "  ${CYAN}dev-infra${NC}  - تشغيل البنية التحتية فقط (Postgres, Redis, MinIO) للتطوير المحلي"
  echo ""
}

check_docker

case "$1" in
  start)
    echo -e "${GOLD}🚀 جاري تشغيل كافة خدمات مشروع ابن الأزهر...${NC}"
    docker compose up -d
    echo -e "\n${GREEN}✅ تم بدء تشغيل الخدمات في الخلفية!${NC}"
    echo -e "سيرفر الويب متاح الآن على الرابط: ${CYAN}http://localhost:3000${NC}"
    echo -e "لفحص حالة الخدمات شَغِّل: ${GOLD}./ibn.sh status${NC}"
    ;;
  
  stop)
    echo -e "${GOLD}🛑 جاري إيقاف تشغيل كافة خدمات المشروع...${NC}"
    docker compose down
    echo -e "${GREEN}✅ تم إيقاف جميع الحاويات بنجاح.${NC}"
    ;;
    
  restart)
    echo -e "${GOLD}🔄 جاري إعادة تشغيل الخدمات...${NC}"
    docker compose restart
    echo -e "${GREEN}✅ تم إعادة التشغيل بنجاح.${NC}"
    ;;
    
  status)
    echo -e "${CYAN}📊 حالة الحاويات الحالية:${NC}"
    docker compose ps
    ;;
    
  logs)
    docker compose logs -f
    ;;
    
  logs-web)
    docker compose logs -f web
    ;;
    
  logs-ocr)
    docker compose logs -f ocr-worker
    ;;
    
  clean)
    echo -e "${RED}⚠️  تحذير: سيتم حذف كافة البيانات المخزنة بقاعدة البيانات وملفات MinIO!${NC}"
    read -p "هل أنت متأكد من رغبتك بالاستمرار؟ [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      echo -e "${GOLD}🧹 جاري إيقاف الخدمات وحذف المجلدات والبيانات...${NC}"
      docker compose down -v
      echo -e "${GREEN}✅ تم التنظيف بالكامل وبدء المجلدات من جديد.${NC}"
    else
      echo -e "${CYAN}تم إلغاء عملية التنظيف.${NC}"
    fi
    ;;
    
  dev-infra)
    echo -e "${GOLD}⚙️  جاري تشغيل خدمات الخلفية فقط (Postgres, Redis, MinIO)...${NC}"
    docker compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ الخدمات جاهزة للتطوير المحلي!${NC}"
    echo -e "قاعدة البيانات تعمل على المنفذ: ${CYAN}5433${NC}"
    echo -e "الآن يمكنك تشغيل السيرفر محلياً عبر: ${GOLD}pnpm --filter @ibn-al-azhar-docs/web dev${NC}"
    ;;
    
  *)
    show_help
    exit 1
    ;;
esac
