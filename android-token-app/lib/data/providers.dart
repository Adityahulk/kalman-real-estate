import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';

final databaseProvider = Provider<AppDatabase>((ref) {
  final database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});

final projectsProvider = StreamProvider.autoDispose((ref) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.projects)..orderBy([(tbl) => OrderingTerm(expression: tbl.updatedAt, mode: OrderingMode.desc)])).watch();
});

final projectProvider = StreamProvider.autoDispose.family<Project?, int>((ref, projectId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.projects)..where((tbl) => tbl.id.equals(projectId))).watchSingleOrNull();
});

final buyersProvider = StreamProvider.autoDispose.family<List<Buyer>, int>((ref, projectId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.buyers)..where((tbl) => tbl.projectId.equals(projectId))).watch();
});

final tokensProvider = StreamProvider.autoDispose.family<List<Token>, int>((ref, projectId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).watch();
});

final plotsProvider = StreamProvider.autoDispose.family<List<Plot>, int>((ref, projectId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.plots)
        ..where((tbl) => tbl.projectId.equals(projectId))
        ..orderBy([(tbl) => OrderingTerm(expression: tbl.plotNumber)]))
      .watch();
});

final plotHistoryProvider = StreamProvider.autoDispose.family<List<PlotHistoryData>, int>((ref, plotId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.plotHistory)
        ..where((tbl) => tbl.plotId.equals(plotId))
        ..orderBy([(tbl) => OrderingTerm(expression: tbl.createdAt, mode: OrderingMode.desc)]))
      .watch();
});

final plotPaymentsProvider = StreamProvider.autoDispose.family<List<PaymentEntry>, int>((ref, plotId) {
  final db = ref.watch(databaseProvider);
  return (db.select(db.paymentEntries)
        ..where((tbl) => tbl.plotId.equals(plotId))
        ..orderBy([(tbl) => OrderingTerm(expression: tbl.date, mode: OrderingMode.desc)]))
      .watch();
});
