import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

class ProjectStatus {
  static const preLaunch = 'preLaunch';
  static const launched = 'launched';
}

class TokenStatus {
  static const active = 'active';
  static const assigned = 'assigned';
  static const cancelled = 'cancelled';
  static const transferred = 'transferred';
  static const refunded = 'refunded';
}

class PlotStatus {
  static const empty = 'empty';
  static const manualAssigned = 'manualAssigned';
  static const drawAssigned = 'drawAssigned';
  static const booked = 'booked';
  static const cancelled = 'cancelled';
}

class PaymentStatus {
  static const pending = 'pending';
  static const partial = 'partial';
  static const paid = 'paid';
}

class PaymentType {
  static const token = 'token';
  static const booking = 'booking';
  static const installment = 'installment';
  static const adjustment = 'adjustment';
  static const refund = 'refund';
}

class PaymentStage {
  static const token = 'token';
  static const booking = 'booking';
  static const installment1 = 'installment1';
  static const installment2 = 'installment2';
  static const installment3 = 'installment3';
  static const installment4 = 'installment4';
  static const adjustment = 'adjustment';
  static const refund = 'refund';

  static const all = [
    token,
    booking,
    installment1,
    installment2,
    installment3,
    installment4,
    adjustment,
    refund,
  ];

  static String label(String stage) {
    return switch (stage) {
      token => 'Token',
      booking => 'Booking',
      installment1 => '1st Installment',
      installment2 => '2nd Installment',
      installment3 => '3rd Installment',
      installment4 => '4th Installment',
      adjustment => 'Adjustment',
      refund => 'Refund',
      _ => stage,
    };
  }
}

class HistoryAction {
  static const created = 'created';
  static const manualAssigned = 'manualAssigned';
  static const drawAssigned = 'drawAssigned';
  static const reassigned = 'reassigned';
  static const cancelled = 'cancelled';
  static const paymentAdded = 'paymentAdded';
  static const tokenRedistributed = 'tokenRedistributed';
  static const eoiUpdated = 'eoiUpdated';
}

class Projects extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  TextColumn get launchStatus => text().withDefault(const Constant(ProjectStatus.preLaunch))();
  IntColumn get totalPlots => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class Buyers extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get name => text()();
  TextColumn get guardianName => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get channelPartner => text()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class Tokens extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  IntColumn get buyerId => integer().references(Buyers, #id, onDelete: KeyAction.cascade)();
  TextColumn get tokenCode => text()();
  RealColumn get amount => real()();
  TextColumn get status => text().withDefault(const Constant(TokenStatus.active))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column<Object>>> get uniqueKeys => [
        {projectId, tokenCode},
      ];
}

class Plots extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get plotNumber => text()();
  RealColumn get areaSqYards => real().nullable()();
  IntColumn get holderBuyerId => integer().nullable().references(Buyers, #id, onDelete: KeyAction.setNull)();
  IntColumn get assignedTokenId => integer().nullable().references(Tokens, #id, onDelete: KeyAction.setNull)();
  TextColumn get channelPartner => text().nullable()();
  TextColumn get status => text().withDefault(const Constant(PlotStatus.empty))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column<Object>>> get uniqueKeys => [
        {projectId, plotNumber},
      ];
}

class EoiForms extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  IntColumn get plotId => integer().references(Plots, #id, onDelete: KeyAction.cascade)();
  IntColumn get buyerId => integer().nullable().references(Buyers, #id, onDelete: KeyAction.setNull)();
  TextColumn get buyerName => text().nullable()();
  TextColumn get guardianName => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get contactNo => text().nullable()();
  TextColumn get channelPartner => text().nullable()();
  TextColumn get plotNumber => text().nullable()();
  RealColumn get areaSqYards => real().nullable()();
  RealColumn get ratePerSqYard => real().nullable()();
  RealColumn get totalAmount => real().nullable()();
  RealColumn get ifmsCharges => real().nullable()();
  RealColumn get idcCharges => real().nullable()();
  TextColumn get clubMembership => text().nullable()();
  TextColumn get notes => text().withDefault(const Constant(defaultEoiNotes))();
  BoolColumn get plotDetailsEnabled => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  List<Set<Column<Object>>> get uniqueKeys => [
        {plotId},
      ];
}

class PaymentSchedules extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get plotId => integer().references(Plots, #id, onDelete: KeyAction.cascade)();
  TextColumn get stageKey => text().nullable()();
  TextColumn get scheduleName => text()();
  RealColumn get percentage => real()();
  DateTimeColumn get dueDate => dateTime().nullable()();
  RealColumn get amount => real().nullable()();
  TextColumn get status => text().withDefault(const Constant(PaymentStatus.pending))();
}

class PaymentEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  IntColumn get plotId => integer().nullable().references(Plots, #id, onDelete: KeyAction.setNull)();
  IntColumn get buyerId => integer().nullable().references(Buyers, #id, onDelete: KeyAction.setNull)();
  IntColumn get tokenId => integer().nullable().references(Tokens, #id, onDelete: KeyAction.setNull)();
  DateTimeColumn get date => dateTime()();
  RealColumn get amount => real().customConstraint('NOT NULL CHECK (amount >= 0)')();
  TextColumn get amountInWords => text().nullable()();
  TextColumn get paymentType => text()();
  TextColumn get paymentStage => text().nullable()();
  TextColumn get holderSignaturePath => text().nullable()();
  TextColumn get authorizedSignaturePath => text().nullable()();
  TextColumn get note => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class PlotHistory extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get projectId => integer().references(Projects, #id, onDelete: KeyAction.cascade)();
  IntColumn get plotId => integer().references(Plots, #id, onDelete: KeyAction.cascade)();
  TextColumn get actionType => text()();
  IntColumn get oldBuyerId => integer().nullable()();
  IntColumn get newBuyerId => integer().nullable()();
  IntColumn get oldTokenId => integer().nullable()();
  IntColumn get newTokenId => integer().nullable()();
  RealColumn get amount => real().nullable()();
  TextColumn get note => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class AppSettings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get key => text().unique()();
  TextColumn get value => text()();
}

const defaultEoiNotes = '''
IFMS & one time charges, monthly maintenance charges, club membership, GST or other charges shall be charged extra as per application.
Interest @15% p.a. shall be charged on delayed payment.
Actual plot/unit size may vary and unit number may be changed.
''';

@DriftDatabase(
  tables: [
    Projects,
    Buyers,
    Tokens,
    Plots,
    EoiForms,
    PaymentSchedules,
    PaymentEntries,
    PlotHistory,
    AppSettings,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.addColumn(paymentEntries, paymentEntries.paymentStage);
            await m.addColumn(paymentSchedules, paymentSchedules.stageKey);
            await customUpdate(
              'UPDATE payment_entries SET payment_stage = CASE payment_type '
              "WHEN '${PaymentType.token}' THEN '${PaymentStage.token}' "
              "WHEN '${PaymentType.booking}' THEN '${PaymentStage.booking}' "
              "WHEN '${PaymentType.installment}' THEN '${PaymentStage.installment1}' "
              "WHEN '${PaymentType.adjustment}' THEN '${PaymentStage.adjustment}' "
              "WHEN '${PaymentType.refund}' THEN '${PaymentStage.refund}' "
              'ELSE payment_type END',
            );
          }
        },
      );

  Future<int> createProject(String name) {
    final now = DateTime.now();
    return into(projects).insert(
      ProjectsCompanion.insert(
        name: name.trim(),
        createdAt: Value(now),
        updatedAt: Value(now),
      ),
    );
  }

  Future<void> setProjectLaunchStatus(int projectId, String status) async {
    await (update(projects)..where((tbl) => tbl.id.equals(projectId))).write(
      ProjectsCompanion(
        launchStatus: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> generatePlots(int projectId, int totalPlots) async {
    if (totalPlots <= 0) throw ArgumentError('Plot count must be greater than zero.');
    await transaction(() async {
      final existing = await (select(plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
      if (existing.isNotEmpty) {
        throw StateError('Plots already exist for this project.');
      }
      final now = DateTime.now();
      for (var i = 1; i <= totalPlots; i++) {
        final plotId = await into(plots).insert(
          PlotsCompanion.insert(
            projectId: projectId,
            plotNumber: i.toString(),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
        await _addHistory(
          projectId: projectId,
          plotId: plotId,
          actionType: HistoryAction.created,
          note: 'Plot ${i.toString()} generated.',
        );
      }
      await (update(projects)..where((tbl) => tbl.id.equals(projectId))).write(
        ProjectsCompanion(totalPlots: Value(totalPlots), updatedAt: Value(now)),
      );
    });
  }

  Future<int> createBuyerWithToken({
    required int projectId,
    required String name,
    required String channelPartner,
    required String tokenCode,
    required double amount,
    String? phone,
    String? guardianName,
    String? address,
    String? amountInWords,
  }) async {
    if (amount < 0) throw ArgumentError('Token amount cannot be negative.');
    return transaction(() async {
      final now = DateTime.now();
      final buyerId = await into(buyers).insert(
        BuyersCompanion.insert(
          projectId: projectId,
          name: name.trim(),
          channelPartner: channelPartner.trim(),
          phone: Value(phone?.trim()),
          guardianName: Value(guardianName?.trim()),
          address: Value(address?.trim()),
          createdAt: Value(now),
          updatedAt: Value(now),
        ),
      );
      final tokenId = await into(tokens).insert(
        TokensCompanion.insert(
          projectId: projectId,
          buyerId: buyerId,
          tokenCode: tokenCode.trim(),
          amount: amount,
          createdAt: Value(now),
          updatedAt: Value(now),
        ),
      );
      await into(paymentEntries).insert(
        PaymentEntriesCompanion.insert(
          projectId: projectId,
          buyerId: Value(buyerId),
          tokenId: Value(tokenId),
          date: now,
          amount: amount,
          amountInWords: Value(amountInWords),
          paymentType: PaymentType.token,
          paymentStage: const Value(PaymentStage.token),
          note: const Value('Token amount received before plot assignment.'),
        ),
      );
      return buyerId;
    });
  }

  Future<void> addTokenForBuyer({
    required int projectId,
    required int buyerId,
    required String tokenCode,
    required double amount,
    String? amountInWords,
  }) async {
    if (amount < 0) throw ArgumentError('Token amount cannot be negative.');
    await transaction(() async {
      final now = DateTime.now();
      final tokenId = await into(tokens).insert(
        TokensCompanion.insert(
          projectId: projectId,
          buyerId: buyerId,
          tokenCode: tokenCode.trim(),
          amount: amount,
          createdAt: Value(now),
          updatedAt: Value(now),
        ),
      );
      await into(paymentEntries).insert(
        PaymentEntriesCompanion.insert(
          projectId: projectId,
          buyerId: Value(buyerId),
          tokenId: Value(tokenId),
          date: now,
          amount: amount,
          amountInWords: Value(amountInWords),
          paymentType: PaymentType.token,
          paymentStage: const Value(PaymentStage.token),
          note: const Value('Additional token amount received.'),
        ),
      );
    });
  }

  Future<List<DrawAssignment>> previewDraw(int projectId) async {
    final availableTokens = await (select(tokens)
          ..where((tbl) => tbl.projectId.equals(projectId) & tbl.status.equals(TokenStatus.active)))
        .get();
    final availablePlots = await (select(plots)
          ..where((tbl) => tbl.projectId.equals(projectId) & tbl.status.equals(PlotStatus.empty))
          ..orderBy([(tbl) => OrderingTerm(expression: tbl.plotNumber)]))
        .get();

    final shuffledPlots = [...availablePlots]..shuffle(Random.secure());
    final count = min(availableTokens.length, shuffledPlots.length);
    return [
      for (var i = 0; i < count; i++)
        DrawAssignment(
          tokenId: availableTokens[i].id,
          buyerId: availableTokens[i].buyerId,
          plotId: shuffledPlots[i].id,
          tokenCode: availableTokens[i].tokenCode,
          plotNumber: shuffledPlots[i].plotNumber,
        ),
    ];
  }

  Future<void> confirmDraw(int projectId, List<DrawAssignment> assignments) async {
    await transaction(() async {
      final now = DateTime.now();
      for (final assignment in assignments) {
        final token = await (select(tokens)..where((tbl) => tbl.id.equals(assignment.tokenId))).getSingle();
        final buyer = await (select(buyers)..where((tbl) => tbl.id.equals(assignment.buyerId))).getSingle();
        final plot = await (select(plots)..where((tbl) => tbl.id.equals(assignment.plotId))).getSingle();
        if (token.status != TokenStatus.active || plot.status != PlotStatus.empty) continue;

        await (update(plots)..where((tbl) => tbl.id.equals(plot.id))).write(
          PlotsCompanion(
            holderBuyerId: Value(buyer.id),
            assignedTokenId: Value(token.id),
            channelPartner: Value(buyer.channelPartner),
            status: const Value(PlotStatus.drawAssigned),
            updatedAt: Value(now),
          ),
        );
        await (update(tokens)..where((tbl) => tbl.id.equals(token.id))).write(
          TokensCompanion(status: const Value(TokenStatus.assigned), updatedAt: Value(now)),
        );
        await _addHistory(
          projectId: projectId,
          plotId: plot.id,
          actionType: HistoryAction.drawAssigned,
          newBuyerId: buyer.id,
          newTokenId: token.id,
          amount: token.amount,
          note: 'Draw assigned token ${token.tokenCode} to plot ${plot.plotNumber}.',
        );
      }
    });
  }

  Future<void> assignPlotManually({
    required int projectId,
    required int plotId,
    required int buyerId,
    required int tokenId,
  }) async {
    await transaction(() async {
      final now = DateTime.now();
      final plot = await (select(plots)..where((tbl) => tbl.id.equals(plotId))).getSingle();
      final buyer = await (select(buyers)..where((tbl) => tbl.id.equals(buyerId))).getSingle();
      final token = await (select(tokens)..where((tbl) => tbl.id.equals(tokenId))).getSingle();
      await (update(plots)..where((tbl) => tbl.id.equals(plotId))).write(
        PlotsCompanion(
          holderBuyerId: Value(buyerId),
          assignedTokenId: Value(tokenId),
          channelPartner: Value(buyer.channelPartner),
          status: Value(plot.holderBuyerId == null ? PlotStatus.manualAssigned : PlotStatus.booked),
          updatedAt: Value(now),
        ),
      );
      await (update(tokens)..where((tbl) => tbl.id.equals(tokenId))).write(
        TokensCompanion(status: const Value(TokenStatus.assigned), updatedAt: Value(now)),
      );
      await _addHistory(
        projectId: projectId,
        plotId: plotId,
        actionType: plot.holderBuyerId == null ? HistoryAction.manualAssigned : HistoryAction.reassigned,
        oldBuyerId: plot.holderBuyerId,
        newBuyerId: buyerId,
        oldTokenId: plot.assignedTokenId,
        newTokenId: tokenId,
        amount: token.amount,
        note: 'Plot assigned manually to ${buyer.name}.',
      );
    });
  }

  Future<void> cancelPlotAssignment({
    required int projectId,
    required int plotId,
    required Map<int, double> redistributionByPlotId,
    String? note,
  }) async {
    await transaction(() async {
      final now = DateTime.now();
      final plot = await (select(plots)..where((tbl) => tbl.id.equals(plotId))).getSingle();
      if (plot.holderBuyerId == null || plot.assignedTokenId == null) {
        throw StateError('This plot has no buyer assignment to cancel.');
      }
      final token = await (select(tokens)..where((tbl) => tbl.id.equals(plot.assignedTokenId!))).getSingle();
      final distributedTotal = redistributionByPlotId.values.fold<double>(0, (sum, item) => sum + item);
      if ((distributedTotal - token.amount).abs() > 0.01 && redistributionByPlotId.isNotEmpty) {
        throw ArgumentError('Redistribution total must match cancelled token amount.');
      }

      await (update(plots)..where((tbl) => tbl.id.equals(plot.id))).write(
        PlotsCompanion(
          holderBuyerId: const Value(null),
          assignedTokenId: const Value(null),
          channelPartner: const Value(null),
          status: const Value(PlotStatus.empty),
          updatedAt: Value(now),
        ),
      );
      await (update(tokens)..where((tbl) => tbl.id.equals(token.id))).write(
        TokensCompanion(
          status: Value(redistributionByPlotId.isEmpty ? TokenStatus.refunded : TokenStatus.cancelled),
          updatedAt: Value(now),
        ),
      );
      await _addHistory(
        projectId: projectId,
        plotId: plot.id,
        actionType: HistoryAction.cancelled,
        oldBuyerId: plot.holderBuyerId,
        oldTokenId: plot.assignedTokenId,
        amount: token.amount,
        note: note ?? 'Assignment cancelled. Plot is available again.',
      );

      if (redistributionByPlotId.isEmpty) {
        await into(paymentEntries).insert(
          PaymentEntriesCompanion.insert(
            projectId: projectId,
            plotId: Value(plot.id),
            buyerId: Value(plot.holderBuyerId),
            tokenId: Value(token.id),
            date: now,
            amount: token.amount,
            paymentType: PaymentType.refund,
            paymentStage: const Value(PaymentStage.refund),
            note: const Value('Refund or credit due because buyer has no redistribution target.'),
          ),
        );
        return;
      }

      for (final entry in redistributionByPlotId.entries) {
        await into(paymentEntries).insert(
          PaymentEntriesCompanion.insert(
            projectId: projectId,
            plotId: Value(entry.key),
            buyerId: Value(plot.holderBuyerId),
            tokenId: Value(token.id),
            date: now,
            amount: entry.value,
            paymentType: PaymentType.adjustment,
            paymentStage: const Value(PaymentStage.adjustment),
            note: Value('Redistributed from cancelled plot ${plot.plotNumber}.'),
          ),
        );
        await _addHistory(
          projectId: projectId,
          plotId: entry.key,
          actionType: HistoryAction.tokenRedistributed,
          newBuyerId: plot.holderBuyerId,
          newTokenId: token.id,
          amount: entry.value,
          note: 'Token amount redistributed from cancelled plot ${plot.plotNumber}.',
        );
      }
    });
  }

  Future<int> addPayment({
    required int projectId,
    required int plotId,
    int? buyerId,
    int? tokenId,
    required DateTime date,
    required double amount,
    String? amountInWords,
    required String paymentType,
    String? paymentStage,
    String? holderSignaturePath,
    String? authorizedSignaturePath,
    String? note,
  }) async {
    if (amount < 0) throw ArgumentError('Payment amount cannot be negative.');
    return transaction(() async {
      final paymentId = await into(paymentEntries).insert(
        PaymentEntriesCompanion.insert(
          projectId: projectId,
          plotId: Value(plotId),
          buyerId: Value(buyerId),
          tokenId: Value(tokenId),
          date: date,
          amount: amount,
          amountInWords: Value(amountInWords),
          paymentType: paymentType,
          paymentStage: Value(paymentStage ?? defaultPaymentStageForType(paymentType)),
          holderSignaturePath: Value(holderSignaturePath),
          authorizedSignaturePath: Value(authorizedSignaturePath),
          note: Value(note),
        ),
      );
      await _addHistory(
        projectId: projectId,
        plotId: plotId,
        actionType: HistoryAction.paymentAdded,
        newBuyerId: buyerId,
        newTokenId: tokenId,
        amount: amount,
        note: note ?? 'Payment entry added.',
      );
      return paymentId;
    });
  }

  Future<void> upsertEoi(EoiFormsCompanion companion) async {
    await transaction(() async {
      await into(eoiForms).insertOnConflictUpdate(companion);
      final plotId = companion.plotId.value;
      final projectId = companion.projectId.value;
      await _addHistory(
        projectId: projectId,
        plotId: plotId,
        actionType: HistoryAction.eoiUpdated,
        newBuyerId: companion.buyerId.present ? companion.buyerId.value : null,
        note: 'EOI form updated.',
      );
    });
  }

  Future<void> savePaymentSchedule(int plotId, List<PaymentSchedulesCompanion> rows) async {
    await transaction(() async {
      await (delete(paymentSchedules)..where((tbl) => tbl.plotId.equals(plotId))).go();
      for (final row in rows) {
        await into(paymentSchedules).insert(row);
      }
    });
  }

  String defaultPaymentStageForType(String paymentType) {
    return switch (paymentType) {
      PaymentType.token => PaymentStage.token,
      PaymentType.booking => PaymentStage.booking,
      PaymentType.installment => PaymentStage.installment1,
      PaymentType.adjustment => PaymentStage.adjustment,
      PaymentType.refund => PaymentStage.refund,
      _ => paymentType,
    };
  }

  Future<void> setSetting(String key, String value) async {
    await into(appSettings).insertOnConflictUpdate(AppSettingsCompanion.insert(key: key, value: value));
  }

  Future<String?> getSetting(String key) async {
    final row = await (select(appSettings)..where((tbl) => tbl.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  Future<void> _addHistory({
    required int projectId,
    required int plotId,
    required String actionType,
    int? oldBuyerId,
    int? newBuyerId,
    int? oldTokenId,
    int? newTokenId,
    double? amount,
    String? note,
  }) {
    return into(plotHistory).insert(
      PlotHistoryCompanion.insert(
        projectId: projectId,
        plotId: plotId,
        actionType: actionType,
        oldBuyerId: Value(oldBuyerId),
        newBuyerId: Value(newBuyerId),
        oldTokenId: Value(oldTokenId),
        newTokenId: Value(newTokenId),
        amount: Value(amount),
        note: Value(note),
      ),
    );
  }
}

QueryExecutor _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'kalman_token_plot_app.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

class DrawAssignment {
  const DrawAssignment({
    required this.tokenId,
    required this.buyerId,
    required this.plotId,
    required this.tokenCode,
    required this.plotNumber,
  });

  final int tokenId;
  final int buyerId;
  final int plotId;
  final String tokenCode;
  final String plotNumber;
}
