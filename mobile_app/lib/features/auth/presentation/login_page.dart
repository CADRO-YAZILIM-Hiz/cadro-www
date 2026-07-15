import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../shared/providers/app_providers.dart';
import '../domain/auth_state.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _obscurePassword = true;
  late final AnimationController _animController;
  late final Animation<double> _fadeIn;
  late final Animation<Offset> _slideUp;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeIn = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideUp = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (next.deactivatedDeviceCount != null &&
          next.deactivatedDeviceCount! > 0 &&
          previous?.deactivatedDeviceCount != next.deactivatedDeviceCount) {
        final removedCount = next.deactivatedDeviceCount!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr(
                      removedCount == 1
                          ? 'device_switch_notice_single'
                          : 'device_switch_notice_multi',
                    ),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF0F766E),
          ),
        );
      }
      if (next.status == AuthStatus.mfaRequired) {
        context.go('/mfa');
      } else if (next.status == AuthStatus.authenticated) {
        context.go(resolveHomeRoute(next.role));
      }
      if (next.errorMessage != null &&
          next.errorMessage!.isNotEmpty &&
          previous?.errorMessage != next.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(next.errorMessage!)),
              ],
            ),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    });

    final authState = ref.watch(authControllerProvider);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF0F4FF), Color(0xFFF7FBFD), Color(0xFFFBFCFE)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          // Decorative orbs
          Positioned(
            top: -size.width * 0.3,
            right: -size.width * 0.2,
            child: _GlowOrb(
              size: size.width * 0.7,
              color1: const Color(0xFF1D4ED8).withValues(alpha: 0.12),
              color2: const Color(0xFF0EA5E9).withValues(alpha: 0.06),
            ),
          ),
          Positioned(
            bottom: -size.width * 0.25,
            left: -size.width * 0.15,
            child: _GlowOrb(
              size: size.width * 0.6,
              color1: const Color(0xFF0F766E).withValues(alpha: 0.10),
              color2: const Color(0xFF22C55E).withValues(alpha: 0.04),
            ),
          ),
          // Language button top-right
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 16,
            child: PopupMenuButton<String>(
              onSelected: (value) =>
                  ref.read(appLocaleProvider.notifier).state = Locale(value),
              offset: const Offset(0, 42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.language_rounded, size: 18, color: Color(0xFF475569)),
                    const SizedBox(width: 6),
                    Text(
                      context.tr('language'),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'tr', child: Text('Türkçe')),
                PopupMenuItem(value: 'en', child: Text('English')),
                PopupMenuItem(value: 'de', child: Text('Deutsch')),
                PopupMenuItem(value: 'ar', child: Text('العربية')),
              ],
            ),
          ),
          // Main content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: FadeTransition(
                  opacity: _fadeIn,
                  child: SlideTransition(
                    position: _slideUp,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 32),
                          // Logo
                          Container(
                            decoration: BoxDecoration(
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF1D4ED8).withValues(alpha: 0.18),
                                  blurRadius: 28,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(22),
                              child: Image.asset(
                                'assets/graphics/Cadro Logo.png',
                                width: 120,
                                height: 120,
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Subtitle
                          Text(
                            context.tr('login_title'),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 44),
                          // Login card
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28),
                              border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.6)),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0F172A).withValues(alpha: 0.05),
                                  blurRadius: 32,
                                  offset: const Offset(0, 12),
                                ),
                                BoxShadow(
                                  color: const Color(0xFF0F172A).withValues(alpha: 0.02),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Email field
                                TextField(
                                  controller: _emailController,
                                  focusNode: _emailFocus,
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  onSubmitted: (_) => _passwordFocus.requestFocus(),
                                  decoration: InputDecoration(
                                    labelText: context.tr('email'),
                                    prefixIcon: const Padding(
                                      padding: EdgeInsets.only(left: 14, right: 10),
                                      child: Icon(Icons.mail_outline_rounded, size: 20, color: Color(0xFF94A3B8)),
                                    ),
                                    prefixIconConstraints: const BoxConstraints(minWidth: 0),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                // Password field
                                TextField(
                                  controller: _passwordController,
                                  focusNode: _passwordFocus,
                                  obscureText: _obscurePassword,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) {
                                    if (!authState.isLoading) {
                                      ref.read(authControllerProvider.notifier).login(
                                            _emailController.text.trim(),
                                            _passwordController.text,
                                          );
                                    }
                                  },
                                  decoration: InputDecoration(
                                    labelText: context.tr('password'),
                                    prefixIcon: const Padding(
                                      padding: EdgeInsets.only(left: 14, right: 10),
                                      child: Icon(Icons.lock_outline_rounded, size: 20, color: Color(0xFF94A3B8)),
                                    ),
                                    prefixIconConstraints: const BoxConstraints(minWidth: 0),
                                    suffixIcon: GestureDetector(
                                      onTap: () => setState(() => _obscurePassword = !_obscurePassword),
                                      child: Padding(
                                        padding: const EdgeInsets.only(right: 12),
                                        child: Icon(
                                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          size: 20,
                                          color: const Color(0xFF94A3B8),
                                        ),
                                      ),
                                    ),
                                    suffixIconConstraints: const BoxConstraints(minWidth: 0),
                                  ),
                                ),
                                const SizedBox(height: 28),
                                // Login button
                                _LoginButton(
                                  isLoading: authState.isLoading,
                                  label: authState.isLoading
                                      ? context.tr('loading')
                                      : context.tr('continue'),
                                  onPressed: authState.isLoading
                                      ? null
                                      : () => ref.read(authControllerProvider.notifier).login(
                                            _emailController.text.trim(),
                                            _passwordController.text,
                                          ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 28),
                          // Footer
                          Text(
                            '© ${DateTime.now().year} CADRO',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFCBD5E1),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginButton extends StatelessWidget {
  const _LoginButton({
    required this.isLoading,
    required this.label,
    required this.onPressed,
  });

  final bool isLoading;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          height: 56,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: onPressed == null
                ? const LinearGradient(
                    colors: [Color(0xFFCBD5E1), Color(0xFFCBD5E1)],
                  )
                : const LinearGradient(
                    colors: [Color(0xFF1D4ED8), Color(0xFF0F766E)],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
            boxShadow: onPressed == null
                ? null
                : [
                    BoxShadow(
                      color: const Color(0xFF1D4ED8).withValues(alpha: 0.30),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({
    required this.size,
    required this.color1,
    required this.color2,
  });

  final double size;
  final Color color1;
  final Color color2;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color1, color2, Colors.transparent],
          ),
        ),
      ),
    );
  }
}
