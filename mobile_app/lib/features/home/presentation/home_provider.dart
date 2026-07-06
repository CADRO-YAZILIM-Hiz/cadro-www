import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/home_service.dart';
import '../../../shared/providers/app_providers.dart';

final homeServiceProvider = Provider<HomeService>(
  (ref) => HomeService(ref.watch(apiClientProvider)),
);

final homeDataProvider = FutureProvider<Map<String, dynamic>>(
  (ref) => ref.watch(homeServiceProvider).fetchHome(),
);

