import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kalman_token_app/data/app_database.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
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
  });
}
