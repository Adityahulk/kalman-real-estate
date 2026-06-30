import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_screen.dart';
import '../features/auth/auth_service.dart';
import '../features/buyers/buyers_screen.dart';
import '../features/draw/draw_screen.dart';
import '../features/eoi/eoi_screen.dart';
import '../features/exports/exports_screen.dart';
import '../features/payments/payment_screen.dart';
import '../features/plots/plot_detail_screen.dart';
import '../features/plots/plots_screen.dart';
import '../features/projects/project_dashboard_screen.dart';
import '../features/projects/projects_screen.dart';
import '../features/search/search_screen.dart';

final _routerRefreshProvider = ChangeNotifierProvider((ref) {
  final notifier = RouterRefreshNotifier();
  ref.listen(authControllerProvider, (_, __) => notifier.notifyListeners());
  return notifier;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.read(_routerRefreshProvider);
  final router = GoRouter(
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider).valueOrNull;
      final isLogin = state.matchedLocation == '/login';
      if (auth == null) return isLogin ? null : '/login';
      if (!auth.isLoggedIn) return isLogin ? null : '/login';
      if (isLogin) return '/projects';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const AuthScreen()),
      GoRoute(path: '/projects', builder: (context, state) => const ProjectsScreen()),
      GoRoute(
        path: '/projects/:projectId',
        builder: (context, state) => ProjectDashboardScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
      GoRoute(
        path: '/projects/:projectId/buyers',
        builder: (context, state) => BuyersScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
      GoRoute(
        path: '/projects/:projectId/plots',
        builder: (context, state) => PlotsScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
      GoRoute(
        path: '/projects/:projectId/plots/:plotId',
        builder: (context, state) => PlotDetailScreen(
          projectId: int.parse(state.pathParameters['projectId']!),
          plotId: int.parse(state.pathParameters['plotId']!),
        ),
      ),
      GoRoute(
        path: '/projects/:projectId/plots/:plotId/eoi',
        builder: (context, state) => EoiScreen(
          projectId: int.parse(state.pathParameters['projectId']!),
          plotId: int.parse(state.pathParameters['plotId']!),
        ),
      ),
      GoRoute(
        path: '/projects/:projectId/plots/:plotId/payment',
        builder: (context, state) => PaymentScreen(
          projectId: int.parse(state.pathParameters['projectId']!),
          plotId: int.parse(state.pathParameters['plotId']!),
        ),
      ),
      GoRoute(
        path: '/projects/:projectId/draw',
        builder: (context, state) => DrawScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
      GoRoute(
        path: '/projects/:projectId/exports',
        builder: (context, state) => ExportsScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
      GoRoute(
        path: '/projects/:projectId/search',
        builder: (context, state) => SearchScreen(projectId: int.parse(state.pathParameters['projectId']!)),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

class RouterRefreshNotifier extends ChangeNotifier {
  @override
  void notifyListeners() {
    super.notifyListeners();
  }
}
