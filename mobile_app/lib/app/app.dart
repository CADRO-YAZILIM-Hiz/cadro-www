import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/localization/app_localizations.dart';
import '../shared/providers/app_providers.dart';
import 'theme.dart';

class HrMobileApp extends ConsumerStatefulWidget {
  const HrMobileApp({super.key});

  @override
  ConsumerState<HrMobileApp> createState() => _HrMobileAppState();
}

class _HrMobileAppState extends ConsumerState<HrMobileApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(pushRuntimeServiceProvider).initialize());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(appLocaleProvider);

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      onGenerateTitle: (context) => AppLocalizations.of(context).t('app_title'),
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
