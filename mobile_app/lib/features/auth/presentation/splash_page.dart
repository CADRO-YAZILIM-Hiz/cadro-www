import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/app_providers.dart';
import '../../../shared/widgets/app_background.dart';
import '../domain/auth_state.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  Timer? _bootTimer;

  @override
  void initState() {
    super.initState();
    _bootTimer = Timer(const Duration(milliseconds: 300), () async {
      await ref.read(authControllerProvider.notifier).bootstrap();
      final authState = ref.read(authControllerProvider);
      if (!mounted) return;
      if (authState.status == AuthStatus.authenticated) {
        context.go(resolveHomeRoute(authState.role));
      } else {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    _bootTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.transparent,
      body: AppBackground(
        child: Center(
          child: CircularProgressIndicator(),
        ),
      ),
    );
  }
}
