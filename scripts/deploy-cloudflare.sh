#!/bin/bash
# =============================================================================
# سكربت نشر Cloudflare Workers — Ibn Al-Azhar Docs
# تاريخ الإنشاء: 2026-07-04
# الاستخدام: chmod +x scripts/deploy-cloudflare.sh && ./scripts/deploy-cloudflare.sh
# =============================================================================

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# =============================================================================
# التحقق من المتطلبات
# =============================================================================
check_prerequisites() {
    print_step "التحقق من المتطلبات..."
    
    # التحقق من Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js غير مثبت"
        exit 1
    fi
    
    # التحقق من pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm غير مثبت"
        exit 1
    fi
    
    # التحقق من wrangler
    if ! command -v npx &> /dev/null; then
        print_error "npx غير متوفر"
        exit 1
    fi
    
    # التحقق من ملفات البيئة
    if [ ! -f ".env" ]; then
        print_warning "ملف .env غير موجود — استخدام المتغيرات الافتراضية"
    fi
    
    print_success "جميع المتطلبات متوفرة"
}

# =============================================================================
# التحقق من تسجيل الدخول
# =============================================================================
check_auth() {
    print_step "التحقق من تسجيل الدخول إلى Cloudflare..."
    
    if npx wrangler whoami > /dev/null 2>&1; then
        print_success "مسجّل الدخول إلى Cloudflare"
    else
        print_step "تسجيل الدخول إلى Cloudflare..."
        npx wrangler login
        print_success "تم تسجيل الدخول"
    fi
}

# =============================================================================
# توليد الأنواع
# =============================================================================
generate_types() {
    print_step "توليد أنواع Cloudflare Env..."
    pnpm cf-typegen || print_warning "تجاهل خطأ توليد الأنواع (قد يكون مطلوباً لأول مرة)"
}

# =============================================================================
# الفحص pré-build
# =============================================================================
pre_build_checks() {
    print_step "تشغيل الفحوصات pré-build..."
    
    # TypeScript
    print_step "فحص TypeScript..."
    pnpm --filter=@ibn-al-azhar-docs/web typecheck || {
        print_error "TypeScript فشل — توقف"
        exit 1
    }
    
    # ESLint
    print_step "فحص ESLint..."
    pnpm lint || {
        print_error "ESLint فشل — توقف"
        exit 1
    }
    
    # اختبارات الوحدة
    print_step "تشغيل اختبارات الوحدة..."
    pnpm test || {
        print_error "Unit tests فشلت — توقف"
        exit 1
    }
    
    print_success "جميع الفحوصات نجحت"
}

# =============================================================================
# البناء
# =============================================================================
build() {
    print_step "بناء OpenNext للـ Workers..."
    pnpm deploy
    print_success "تم بناء OpenNext"
}

# =============================================================================
# النشر
# =============================================================================
deploy() {
    print_step "نشر على Cloudflare Workers..."
    npx wrangler deploy
    print_success "تم النشر على Cloudflare Workers"
    
    # نشر الأصول الثابتة
    print_step "نشر الأصول الثابتة..."
    npx wrangler pages deploy .open-next/assets --project-name=ibnalazhardocs || print_warning "تجاهل خطأ نشر الأصول"
    
    print_success "تم النشر بنجاح!"
    print_success "الرابط: https://ibnalazhardocs.workers.dev"
}

# =============================================================================
# ما بعد النشر
# =============================================================================
post_deploy() {
    print_step "تشغيل ما بعد النشر..."
    
    # فحص الحالة الصحية
    print_step "فحص الحالة الصحية..."
    sleep 5
    
    if curl -sf https://ibnalazhardocs.workers.dev/api/health/ready > /dev/null 2>&1; then
        print_success "التطبيق يعمل بنجاح"
    else
        print_warning "التطبيق قد لا يعمل بعد — انتظر قليلاً ثم أعد المحاولة"
    fi
}

# =============================================================================
# التشغيل
# =============================================================================
main() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  نشر Cloudflare Workers — Ibn Al-Azhar Docs${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    
    check_prerequisites
    check_auth
    generate_types
    pre_build_checks
    build
    deploy
    post_deploy
    
    echo ""
    print_success "═══════════════════════════════════════════════════════════════"
    print_success "  اكتمل النشر بنجاح!"
    print_success "═══════════════════════════════════════════════════════════════"
}

main "$@"
