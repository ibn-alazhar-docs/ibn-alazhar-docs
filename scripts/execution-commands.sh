#!/bin/bash
# =============================================================================
# أوامر التنفيذ الجاهزة — Ibn Al-Azhar Docs
# تاريخ الإنشاء: 2026-07-04
# الاستخدام: chmod +x scripts/execution-commands.sh && ./scripts/execution-commands.sh
# =============================================================================

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# الدوال المساعدة
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# =============================================================================
# المرحلة 1: تثبيت المكتبات الجديدة
# =============================================================================
install_dependencies() {
    print_header "تثبيت المكتبات الجديدة"
    
    # إدارة حالة الخادم
    print_step "تثبيت React Query..."
    pnpm add -w @tanstack/react-query @tanstack/react-query-devtools
    
    # إرسال الإيميل
    print_step "تثبيت Resend + React Email..."
    pnpm add -w resend @react-email/components @react-email/render
    
    # الرسوم البيانية
    print_step "تثبيت Recharts..."
    pnpm add -w recharts react-is
    
    # Cloudflare
    print_step "تثبيت OpenNext + Wrangler..."
    pnpm add -D -w @opennextjs/cloudflare wrangler
    
    # Lighthouse CI
    print_step "تثبيت Lighthouse CI..."
    pnpm add -D -w @lhci/cli
    
    print_success "تم تثبيت جميع المكتبات"
}

# =============================================================================
# المرحلة 2: التحقق من الكود
# =============================================================================
verify_code() {
    print_header "التحقق من الكود"
    
    # TypeScript
    print_step "فحص TypeScript..."
    pnpm --filter=@ibn-al-azhar-docs/web typecheck
    print_success "TypeScript: 0 أخطاء"
    
    # ESLint
    print_step "فحص ESLint..."
    pnpm lint
    print_success "ESLint: 0 أخطاء"
    
    # اختبارات الوحدة
    print_step "تشغيل اختبارات الوحدة..."
    pnpm test
    print_success "Unit tests: مكتملة"
    
    # اختبارات API
    print_step "تشغيل اختبارات API..."
    pnpm --filter=@ibn-al-azhar-docs/web test:api
    print_success "API tests: مكتملة"
}

# =============================================================================
# المرحلة 3: البناء
# =============================================================================
build_applications() {
    print_header "بناء التطبيقات"
    
    # بناء التطبيق الرئيسي
    print_step "بناء apps/web..."
    pnpm --filter=@ibn-al-azhar-docs/web build
    print_success "تم بناء apps/web"
    
    # بناء العمال
    print_step "بناء ocr-worker..."
    pnpm --filter=@ibn-al-azhar-docs/ocr-worker build
    print_success "تم بناء ocr-worker"
    
    print_step "بناء export-worker..."
    pnpm --filter=@ibn-al-azhar-docs/export-worker build
    print_success "تم بناء export-worker"
}

# =============================================================================
# المرحلة 4: بناء Docker
# =============================================================================
build_docker() {
    print_header "بناء Docker"
    
    print_step "بناء Docker images..."
    docker compose -f docker-compose.yml build
    print_success "تم بناء Docker images"
}

# =============================================================================
# المرحلة 5: اختبارات E2E
# =============================================================================
run_e2e_tests() {
    print_header "تشغيل اختبارات E2E"
    
    print_step "تشغيل Playwright tests..."
    npx playwright test --reporter=list
    print_success "E2E tests: مكتملة"
}

# =============================================================================
# المرحلة 6: نشر Cloudflare (OpenNext Workers)
# =============================================================================
deploy_cloudflare() {
    print_header "نشر على Cloudflare Workers"
    
    # التحقق من تسجيل الدخول
    print_step "التحقق من تسجيل الدخول إلى Cloudflare..."
    if ! npx wrangler whoami > /dev/null 2>&1; then
        print_step "تسجيل الدخول إلى Cloudflare..."
        npx wrangler login
    fi
    print_success "مسجّل الدخول إلى Cloudflare"
    
    # توليد أنواع Cloudflare
    print_step "توليد أنواع Cloudflare Env..."
    pnpm cf-typegen || print_warning "تجاهل خطأ توليد الأنواع"
    
    # بناء OpenNext
    print_step "بناء OpenNext للـ Workers..."
    pnpm deploy
    print_success "تم بناء OpenNext"
    
    # نشر على Workers
    print_step "نشر على Cloudflare Workers..."
    npx wrangler deploy
    print_success "تم النشر على Cloudflare Workers"
    
    # نشر الأصول (R2/KV)
    print_step "نشر الأصول الثابتة..."
    npx wrangler pages deploy .open-next/assets --project-name=ibn-al-azhar-docs || print_warning "تجاهل خطأ نشر الأصول"
    
    print_success "تم النشر على Cloudflare"
    print_success "الرابط: https://ibnalazhardocs.workers.dev"
}

# =============================================================================
# المرحلة 7: مراقبة الإنتاج
# =============================================================================
monitor_production() {
    print_header "مراقبة الإنتاج"
    
    # فحص الحالة الصحية
    print_step "فحص الحالة الصحية..."
    curl -s http://localhost:3000/api/health | jq .
    
    # فحص المقاييس
    print_step "فحص المقاييس..."
    curl -s http://localhost:3000/api/actuator/metrics | jq .
    
    # تشغيل Lighthouse
    print_step "تشغيل Lighthouse..."
    npx lighthouse http://localhost:3000 --output=json --output-path=./reports/lighthouse-prod.json
    
    print_success "اكتملت المراقبة"
}

# =============================================================================
# القائمة الرئيسية
# =============================================================================
show_menu() {
    echo ""
    echo -e "${BLUE}اختر المرحلة:${NC}"
    echo "1) تثبيت المكتبات"
    echo "2) التحقق من الكود"
    echo "3) بناء التطبيقات"
    echo "4) بناء Docker"
    echo "5) اختبارات E2E"
    echo "6) نشر Cloudflare"
    echo "7) مراقبة الإنتاج"
    echo "8) تشغيل جميع المراحل"
    echo "0) خروج"
    echo ""
}

# =============================================================================
# التشغيل
# =============================================================================
main() {
    if [ "$1" ]; then
        case $1 in
            1) install_dependencies ;;
            2) verify_code ;;
            3) build_applications ;;
            4) build_docker ;;
            5) run_e2e_tests ;;
            6) deploy_cloudflare ;;
            7) monitor_production ;;
            8) 
                install_dependencies
                verify_code
                build_applications
                build_docker
                run_e2e_tests
                deploy_cloudflare
                monitor_production
                ;;
            *) print_error "خيار غير صحيح" ;;
        esac
    else
        while true; do
            show_menu
            read -p "اختر: " choice
            case $choice in
                1) install_dependencies ;;
                2) verify_code ;;
                3) build_applications ;;
                4) build_docker ;;
                5) run_e2e_tests ;;
                6) deploy_cloudflare ;;
                7) monitor_production ;;
                8) 
                    install_dependencies
                    verify_code
                    build_applications
                    build_docker
                    run_e2e_tests
                    deploy_cloudflare
                    monitor_production
                    break
                    ;;
                0) echo "خروج"; exit 0 ;;
                *) print_error "خيار غير صحيح" ;;
            esac
        done
    fi
}

main "$@"
