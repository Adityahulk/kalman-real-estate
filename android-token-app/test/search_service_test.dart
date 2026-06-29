import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kalman_token_app/data/app_database.dart';
import 'package:kalman_token_app/features/search/search_models.dart';
import 'package:kalman_token_app/features/search/search_report_service.dart';
import 'package:kalman_token_app/features/search/search_service.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('search filters plot, customer, channel partner, area, and rate', () async {
    final fixture = await _createSearchFixture(db);
    final results = await SearchService(db).searchProject(
      fixture.projectId,
      const SearchFilters(
        plotQuery: '1',
        customerQuery: 'Meera',
        channelPartnerQuery: 'North',
        areaMin: 90,
        areaMax: 110,
        rateMin: 5000,
        rateMax: 6000,
      ),
    );

    expect(results, hasLength(1));
    expect(results.single.plotNumber, '1');
    expect(results.single.customerName, 'Meera Buyer');
  });

  test('search supports received and pending payment stage filters with OR behavior', () async {
    final fixture = await _createSearchFixture(db);

    final received = await SearchService(db).searchProject(
      fixture.projectId,
      const SearchFilters(
        paymentStatus: SearchPaymentStatus.received,
        paymentStages: {PaymentStage.token},
      ),
    );
    expect(received.map((item) => item.plotNumber), contains('1'));

    final pending = await SearchService(db).searchProject(
      fixture.projectId,
      const SearchFilters(
        paymentStatus: SearchPaymentStatus.pending,
        paymentStages: {PaymentStage.booking, PaymentStage.installment2},
      ),
    );
    expect(pending.map((item) => item.plotNumber), contains('1'));
  });

  test('search returns one row per plot and uses EOI fallback fields', () async {
    final fixture = await _createSearchFixture(db);
    final results = await SearchService(db).searchProject(fixture.projectId, const SearchFilters());

    expect(results.where((item) => item.plotNumber == '1'), hasLength(1));
    expect(results.firstWhere((item) => item.plotNumber == '1').ratePerSqYard, 5500);
  });

  test('exports xlsx, csv, and pdf search reports', () async {
    final fixture = await _createSearchFixture(db);
    final project = await (db.select(db.projects)..where((tbl) => tbl.id.equals(fixture.projectId))).getSingle();
    final results = await SearchService(db).searchProject(fixture.projectId, const SearchFilters());
    final output = await Directory.systemTemp.createTemp('search_reports_');
    final service = SearchReportService();

    final xlsx = await service.writeXlsx(project: project, filters: const SearchFilters(), results: results, outputDirectory: output);
    final csv = await service.writeCsv(project: project, filters: const SearchFilters(), results: results, outputDirectory: output);
    final pdf = await service.writePdf(project: project, filters: const SearchFilters(), results: results, outputDirectory: output);

    expect(await xlsx.exists(), isTrue);
    expect(await xlsx.length(), greaterThan(0));
    expect(await csv.readAsString(), contains('Stage Details'));
    expect(await pdf.length(), greaterThan(0));
  });
}

Future<_Fixture> _createSearchFixture(AppDatabase db) async {
  final projectId = await db.createProject('Ambey Homes');
  await db.generatePlots(projectId, 2);
  final buyerId = await db.createBuyerWithToken(
    projectId: projectId,
    name: 'Meera Buyer',
    channelPartner: 'North CP',
    tokenCode: 'T1',
    amount: 100000,
  );
  final plots = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
  final token = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).getSingle();
  await db.assignPlotManually(projectId: projectId, plotId: plots[0].id, buyerId: buyerId, tokenId: token.id);
  await db.upsertEoi(
    EoiFormsCompanion.insert(
      projectId: projectId,
      plotId: plots[0].id,
      buyerId: Value(buyerId),
      buyerName: const Value('Meera Buyer'),
      channelPartner: const Value('North CP'),
      plotNumber: Value(plots[0].plotNumber),
      areaSqYards: const Value(100),
      ratePerSqYard: const Value(5500),
      totalAmount: const Value(550000),
      plotDetailsEnabled: const Value(true),
    ),
  );
  await db.savePaymentSchedule(plots[0].id, [
    PaymentSchedulesCompanion.insert(
      plotId: plots[0].id,
      stageKey: const Value(PaymentStage.booking),
      scheduleName: 'Booking',
      percentage: 25,
    ),
    PaymentSchedulesCompanion.insert(
      plotId: plots[0].id,
      stageKey: const Value(PaymentStage.installment2),
      scheduleName: '2nd Installment',
      percentage: 25,
    ),
  ]);
  await db.addPayment(
    projectId: projectId,
    plotId: plots[0].id,
    buyerId: buyerId,
    tokenId: token.id,
    date: DateTime(2026, 1, 1),
    amount: 50000,
    paymentType: PaymentType.booking,
    paymentStage: PaymentStage.booking,
  );
  return _Fixture(projectId);
}

class _Fixture {
  const _Fixture(this.projectId);

  final int projectId;
}
