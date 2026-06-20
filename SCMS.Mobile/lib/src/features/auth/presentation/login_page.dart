import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_theme.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../core/widgets/brand_logo.dart';
import '../application/auth_controller.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Page — Premium Sign In / Register with language toggle
//
// Design reference: DESIGN.md (Patient/User Theme Variants) and
// SCMS.WebApp/src/pages/AuthPage.jsx
// ─────────────────────────────────────────────────────────────────────────────

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController(text: 'aung.min@example.test');
  final _passwordController = TextEditingController(text: 'password');
  final _mobileController = TextEditingController();

  bool _isRegister = false;
  bool _obscurePassword = true;

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(_fadeAnimation);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _mobileController.dispose();
    super.dispose();
  }

  void _toggleMode() {
    setState(() => _isRegister = !_isRegister);
    _animController
      ..reset()
      ..forward();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final controller = ref.read(authControllerProvider.notifier);
    if (_isRegister) {
      await controller.signUp(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        mobileNo: _mobileController.text.trim(),
      );
    } else {
      await controller.signIn(
        emailOrMobile: _emailController.text.trim(),
        password: _passwordController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.watch(appStringsProvider);
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final size = MediaQuery.sizeOf(context);

    // Show error snackbar on auth failure.
    ref.listen(authControllerProvider, (prev, next) {
      if (next.hasError && !next.isLoading) {
        final error = next.error;
        final message = error is Exception
            ? error.toString().replaceFirst('Exception: ', '')
            : (_isRegister ? t.registerFailed : t.signInFailed);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: ScmsColors.danger,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: size.width > 500 ? 40 : 24,
              vertical: 24,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: SlideTransition(
                  position: _slideAnimation,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(t, isDark),
                      const SizedBox(height: 28),
                      _buildFormCard(t, isLoading, isDark, theme),
                      const SizedBox(height: 24),
                      _buildFooter(t, isDark),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HEADER — Brand logo + app name + language toggle
  // ═════════════════════════════════════════════════════════════════════════
  Widget _buildHeader(AppStrings t, bool isDark) {
    return Column(
      children: [
        // Brand logo container with subtle shadow.
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: isDark ? ScmsColors.cardDark : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? ScmsColors.borderDark : ScmsColors.borderLight,
            ),
            boxShadow: [
              BoxShadow(
                color: ScmsColors.primary.withValues(alpha: isDark ? 0.15 : 0.08),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Center(child: BrandLogo(size: 38)),
        ),
        const SizedBox(height: 16),
        Text(
          t.appName,
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            color: isDark ? ScmsColors.textDark : ScmsColors.textLight,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          t.appSubtitle,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? ScmsColors.mutedDark : ScmsColors.mutedLight,
          ),
        ),
      ],
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FORM CARD — The premium auth card surface
  // ═════════════════════════════════════════════════════════════════════════
  Widget _buildFormCard(
    AppStrings t,
    bool isLoading,
    bool isDark,
    ThemeData theme,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? ScmsColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: isDark ? ScmsColors.borderDark : ScmsColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF101828).withValues(alpha: isDark ? 0.25 : 0.08),
            blurRadius: 50,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Title row + Language button ────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isRegister ? t.register : t.welcome,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: isDark
                                ? ScmsColors.textDark
                                : ScmsColors.textLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _isRegister ? t.registerHint : t.loginHint,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: isDark
                                ? ScmsColors.mutedDark
                                : ScmsColors.mutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _LanguageToggleButton(isDark: isDark),
                ],
              ),

              const SizedBox(height: 24),

              // ── Name field (register only) ────────────────────────
              if (_isRegister) ...[
                _buildLabel(t.fullName, isDark),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    hintText: t.nameHint,
                    prefixIcon: Icon(
                      Icons.person_outline_rounded,
                      color: isDark
                          ? ScmsColors.mutedDark
                          : ScmsColors.mutedLight,
                      size: 20,
                    ),
                  ),
                  validator: (v) {
                    if (_isRegister && (v == null || v.trim().isEmpty)) {
                      return t.requiredFields;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
              ],

              // ── Email field ───────────────────────────────────────
              _buildLabel(_isRegister ? t.email : '${t.email} / ${t.mobileNo}', isDark),
              const SizedBox(height: 6),
              TextFormField(
                controller: _emailController,
                keyboardType: _isRegister ? TextInputType.emailAddress : TextInputType.text,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  hintText: _isRegister ? t.emailHint : '${t.emailHint} or ${t.mobileHint}',
                  prefixIcon: Icon(
                    Icons.mail_outline_rounded,
                    color:
                        isDark ? ScmsColors.mutedDark : ScmsColors.mutedLight,
                    size: 20,
                  ),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return t.requiredFields;
                  }
                  return null;
                },
              ),

              // ── Mobile field (register only) ──────────────────────
              if (_isRegister) ...[
                const SizedBox(height: 16),
                _buildLabel(t.mobileNo, isDark),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _mobileController,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    hintText: t.mobileHint,
                    prefixIcon: Icon(
                      Icons.phone_outlined,
                      color: isDark
                          ? ScmsColors.mutedDark
                          : ScmsColors.mutedLight,
                      size: 20,
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 16),

              // ── Password field ────────────────────────────────────
              _buildLabel(t.password, isDark),
              const SizedBox(height: 6),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => isLoading ? null : _submit(),
                decoration: InputDecoration(
                  hintText: t.passwordHint,
                  prefixIcon: Icon(
                    Icons.lock_outline_rounded,
                    color:
                        isDark ? ScmsColors.mutedDark : ScmsColors.mutedLight,
                    size: 20,
                  ),
                  suffixIcon: GestureDetector(
                    onTap: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    child: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      color: isDark
                          ? ScmsColors.mutedDark
                          : ScmsColors.mutedLight,
                      size: 20,
                    ),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) {
                    return t.requiredFields;
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // ── Submit button ─────────────────────────────────────
              _SubmitButton(
                isRegister: _isRegister,
                isLoading: isLoading,
                onPressed: _submit,
                isDark: isDark,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // FOOTER — Toggle between Sign In and Register
  // ═════════════════════════════════════════════════════════════════════════
  Widget _buildFooter(AppStrings t, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          _isRegister ? t.alreadyHaveAccount : t.dontHaveAccount,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? ScmsColors.mutedDark : ScmsColors.mutedLight,
          ),
        ),
        const SizedBox(width: 4),
        GestureDetector(
          onTap: _toggleMode,
          child: Text(
            _isRegister ? t.login : t.register,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: ScmsColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  // ── Helper: label text ────────────────────────────────────────────────
  Widget _buildLabel(String text, bool isDark) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: isDark ? ScmsColors.textDark : ScmsColors.textLight,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE TOGGLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

class _LanguageToggleButton extends ConsumerWidget {
  const _LanguageToggleButton({required this.isDark});

  final bool isDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appStringsProvider);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          final current = ref.read(appLocaleProvider);
          ref.read(appLocaleProvider.notifier).state =
              current == AppLocale.en ? AppLocale.mm : AppLocale.en;
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? ScmsColors.borderDark : ScmsColors.borderLight,
            ),
            color: isDark
                ? ScmsColors.surfaceDark
                : ScmsColors.bgLight,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.translate_rounded,
                size: 16,
                color: isDark ? ScmsColors.mutedDark : ScmsColors.mutedLight,
              ),
              const SizedBox(width: 6),
              Text(
                t.language,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isDark ? ScmsColors.textDark : ScmsColors.textLight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMIT BUTTON — with gradient, shadow, and loading spinner
// ═══════════════════════════════════════════════════════════════════════════

class _SubmitButton extends ConsumerWidget {
  const _SubmitButton({
    required this.isRegister,
    required this.isLoading,
    required this.onPressed,
    required this.isDark,
  });

  final bool isRegister;
  final bool isLoading;
  final VoidCallback onPressed;
  final bool isDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appStringsProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [ScmsColors.primary, ScmsColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: ScmsColors.primary.withValues(alpha: isDark ? 0.3 : 0.18),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            height: 48,
            alignment: Alignment.center,
            child: isLoading
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        isRegister ? t.creatingAccount : t.signingIn,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  )
                : Text(
                    isRegister ? t.register : t.login,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
