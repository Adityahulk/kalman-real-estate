import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kalman_token_app/data/app_database.dart';
import 'package:sqlite3/sqlite3.dart' as sqlite;

void main() {
  late AppDatabase db;
  var closeDb = true;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
    closeDb = true;
  });

  tearDown(() async {
    if (closeDb) await db.close();
  });

  test('creates project, plots, buyer, token, and token payment', () async {
    final projectId = await db.createProject('Ambey Homes');
    await db.generatePlots(projectId, 2);
    await db.createBuyerWithToken(
      projectId: projectId,
      name: 'A Buyer',
      channelPartner: 'CP One',
      tokenCode: 'T1',
      amount: 100000,
    );

    final plots = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final tokens = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final payments = await (db.select(db.paymentEntries)..where((tbl) => tbl.projectId.equals(projectId))).get();

    expect(plots, hasLength(2));
    expect(tokens.single.tokenCode, 'T1');
    expect(payments.single.paymentType, PaymentType.token);
    expect(payments.single.paymentStage, PaymentStage.token);
  });

  test('draw assigns active token to empty plot and writes history', () async {
    final projectId = await db.createProject('Ambey Homes');
    await db.generatePlots(projectId, 1);
    await db.createBuyerWithToken(
      projectId: projectId,
      name: 'A Buyer',
      channelPartner: 'CP One',
      tokenCode: 'T1',
      amount: 100000,
    );

    final preview = await db.previewDraw(projectId);
    await db.confirmDraw(projectId, preview);

    final plot = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).getSingle();
    final token = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).getSingle();
    final history = await (db.select(db.plotHistory)..where((tbl) => tbl.projectId.equals(projectId))).get();

    expect(plot.status, PlotStatus.drawAssigned);
    expect(token.status, TokenStatus.assigned);
    expect(history.any((item) => item.actionType == HistoryAction.drawAssigned), isTrue);
  });

  test('cancellation redistributes token amount and frees plot', () async {
    final projectId = await db.createProject('Ambey Homes');
    await db.generatePlots(projectId, 2);
    final buyerId = await db.createBuyerWithToken(
      projectId: projectId,
      name: 'A Buyer',
      channelPartner: 'CP One',
      tokenCode: 'T1',
      amount: 100000,
    );
    await db.addTokenForBuyer(projectId: projectId, buyerId: buyerId, tokenCode: 'T2', amount: 100000);
    final tokens = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final plots = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
    await db.assignPlotManually(projectId: projectId, plotId: plots[0].id, buyerId: buyerId, tokenId: tokens[0].id);
    await db.assignPlotManually(projectId: projectId, plotId: plots[1].id, buyerId: buyerId, tokenId: tokens[1].id);

    await db.cancelPlotAssignment(
      projectId: projectId,
      plotId: plots[0].id,
      redistributionByPlotId: {plots[1].id: 100000},
    );

    final cancelledPlot = await (db.select(db.plots)..where((tbl) => tbl.id.equals(plots[0].id))).getSingle();
    final adjustments = await (db.select(db.paymentEntries)..where((tbl) => tbl.paymentType.equals(PaymentType.adjustment))).get();

    expect(cancelledPlot.status, PlotStatus.empty);
    expect(cancelledPlot.holderBuyerId, isNull);
    expect(adjustments.single.amount, 100000);
    expect(adjustments.single.paymentStage, PaymentStage.adjustment);
  });

  test('new payment entries save explicit payment stage', () async {
    final projectId = await db.createProject('Ambey Homes');
    await db.generatePlots(projectId, 1);
    final buyerId = await db.createBuyerWithToken(
      projectId: projectId,
      name: 'A Buyer',
      channelPartner: 'CP One',
      tokenCode: 'T1',
      amount: 100000,
    );
    final plot = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).getSingle();

    final paymentId = await db.addPayment(
      projectId: projectId,
      plotId: plot.id,
      buyerId: buyerId,
      date: DateTime(2026, 1, 1),
      amount: 250000,
      paymentType: PaymentType.installment,
      paymentStage: PaymentStage.installment2,
    );

    final payment = await (db.select(db.paymentEntries)..where((tbl) => tbl.id.equals(paymentId))).getSingle();
    expect(payment.paymentStage, PaymentStage.installment2);
  });

  test('migration backfills payment stage for old payment entries', () async {
    await db.close();
    closeDb = false;
    final dir = await Directory.systemTemp.createTemp('kalman_migration_');
    final file = File('${dir.path}/old.sqlite');
    final old = sqlite.sqlite3.open(file.path);
    old
      ..execute('''
        CREATE TABLE payment_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id INTEGER NOT NULL,
          plot_id INTEGER NULL,
          buyer_id INTEGER NULL,
          token_id INTEGER NULL,
          date INTEGER NOT NULL,
          amount REAL NOT NULL CHECK (amount >= 0),
          amount_in_words TEXT NULL,
          payment_type TEXT NOT NULL,
          holder_signature_path TEXT NULL,
          authorized_signature_path TEXT NULL,
          note TEXT NULL,
          created_at INTEGER NOT NULL
        );
      ''')
      ..execute('''
        CREATE TABLE payment_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          plot_id INTEGER NOT NULL,
          schedule_name TEXT NOT NULL,
          percentage REAL NOT NULL,
          due_date INTEGER NULL,
          amount REAL NULL,
          status TEXT NOT NULL
        );
      ''')
      ..execute(
        "INSERT INTO payment_entries (project_id, date, amount, payment_type, created_at) VALUES (1, 0, 100, '${PaymentType.installment}', 0);",
      )
      ..execute('PRAGMA user_version = 1')
      ..dispose();

    final migrated = AppDatabase(NativeDatabase(file));
    addTearDown(migrated.close);
    final payment = await migrated.select(migrated.paymentEntries).getSingle();

    expect(payment.paymentStage, PaymentStage.installment1);
  });
}
