import 'package:collection/collection.dart';

import '../../data/app_database.dart';
import 'search_models.dart';

class SearchService {
  SearchService(this.db);

  final AppDatabase db;

  Future<List<SearchResult>> searchProject(int projectId, SearchFilters filters) async {
    final plots = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final buyers = await (db.select(db.buyers)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final tokens = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final eoiForms = await (db.select(db.eoiForms)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final payments = await (db.select(db.paymentEntries)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final schedules = await db.select(db.paymentSchedules).get();

    final buyersById = {for (final buyer in buyers) buyer.id: buyer};
    final tokensById = {for (final token in tokens) token.id: token};
    final eoiByPlot = {for (final eoi in eoiForms) eoi.plotId: eoi};
    final schedulesByPlot = groupBy(schedules, (PaymentSchedule schedule) => schedule.plotId);

    final results = <SearchResult>[];
    for (final plot in plots) {
      final buyer = plot.holderBuyerId == null ? null : buyersById[plot.holderBuyerId];
      final token = plot.assignedTokenId == null ? null : tokensById[plot.assignedTokenId];
      final eoi = eoiByPlot[plot.id];
      final plotPayments = payments
          .where(
            (payment) =>
                payment.plotId == plot.id ||
                (plot.assignedTokenId != null && payment.tokenId == plot.assignedTokenId),
          )
          .toList();
      final plotSchedules = schedulesByPlot[plot.id] ?? const <PaymentSchedule>[];

      final customerName = _firstText([buyer?.name, eoi?.buyerName]);
      final channelPartner = _firstText([plot.channelPartner, buyer?.channelPartner, eoi?.channelPartner]);
      final area = plot.areaSqYards ?? eoi?.areaSqYards;
      final rate = eoi?.ratePerSqYard;
      final total = eoi?.totalAmount;
      final stageDetails = _stageDetails(
        token: token,
        eoi: eoi,
        payments: plotPayments,
        schedules: plotSchedules,
      );
      final totalReceived = plotPayments.where((payment) => payment.paymentStage != PaymentStage.refund && payment.paymentType != PaymentType.refund).fold<double>(0, (sum, item) => sum + item.amount);
      final totalPending = total == null ? null : (total - totalReceived).clamp(0, double.infinity).toDouble();

      final result = SearchResult(
        plotId: plot.id,
        plotNumber: plot.plotNumber,
        customerName: customerName,
        channelPartner: channelPartner,
        areaSqYards: area,
        ratePerSqYard: rate,
        totalAmount: total,
        totalReceived: totalReceived,
        totalPending: totalPending,
        stageDetails: stageDetails,
      );
      if (_matches(result, filters)) results.add(result);
    }

    results.sort((a, b) => _naturalCompare(a.plotNumber, b.plotNumber));
    return results;
  }

  List<StagePaymentDetail> _stageDetails({
    required Token? token,
    required EoiForm? eoi,
    required List<PaymentEntry> payments,
    required List<PaymentSchedule> schedules,
  }) {
    return [
      for (final stage in PaymentStage.all)
        StagePaymentDetail(
          stage: stage,
          label: PaymentStage.label(stage),
          expected: _expectedForStage(stage, token, eoi, schedules),
          received: payments
              .where((payment) => _paymentStage(payment) == stage)
              .fold<double>(0, (sum, payment) => sum + payment.amount),
        ),
    ];
  }

  double? _expectedForStage(String stage, Token? token, EoiForm? eoi, List<PaymentSchedule> schedules) {
    if (stage == PaymentStage.token) return token?.amount;
    if (stage == PaymentStage.adjustment || stage == PaymentStage.refund) return null;

    final matching = schedules.firstWhereOrNull((schedule) => _scheduleStage(schedule, schedules) == stage);
    if (matching == null) return null;
    if (matching.amount != null) return matching.amount;
    if (eoi?.totalAmount != null) return eoi!.totalAmount! * matching.percentage / 100;
    return null;
  }

  String _paymentStage(PaymentEntry payment) {
    return payment.paymentStage ?? db.defaultPaymentStageForType(payment.paymentType);
  }

  String _scheduleStage(PaymentSchedule schedule, List<PaymentSchedule> allSchedules) {
    if (schedule.stageKey != null && schedule.stageKey!.trim().isNotEmpty) return schedule.stageKey!;
    final name = schedule.scheduleName.toLowerCase();
    if (name.contains('token')) return PaymentStage.token;
    if (name.contains('booking')) return PaymentStage.booking;
    if (name.contains('2') || name.contains('ii')) return PaymentStage.installment2;
    if (name.contains('3') || name.contains('iii')) return PaymentStage.installment3;
    if (name.contains('4') || name.contains('iv')) return PaymentStage.installment4;
    final index = allSchedules.indexWhere((item) => item.id == schedule.id);
    return switch (index) {
      0 => PaymentStage.booking,
      1 => PaymentStage.installment2,
      2 => PaymentStage.installment3,
      3 => PaymentStage.installment4,
      _ => PaymentStage.installment1,
    };
  }

  bool _matches(SearchResult result, SearchFilters filters) {
    if (!_contains(result.plotNumber, filters.plotQuery)) return false;
    if (!_contains(result.customerName, filters.customerQuery)) return false;
    if (!_contains(result.channelPartner, filters.channelPartnerQuery)) return false;
    if (!_inRange(result.areaSqYards, filters.areaMin, filters.areaMax)) return false;
    if (!_inRange(result.ratePerSqYard, filters.rateMin, filters.rateMax)) return false;
    if (filters.paymentStatus == SearchPaymentStatus.any) return true;

    final stages = filters.paymentStages.isEmpty ? result.stageDetails : result.stageDetails.where((stage) => filters.paymentStages.contains(stage.stage));
    if (filters.paymentStatus == SearchPaymentStatus.received) return stages.any((stage) => stage.isReceived);
    if (filters.paymentStatus == SearchPaymentStatus.pending) return stages.any((stage) => stage.isPending);
    return true;
  }

  bool _contains(String value, String query) {
    final trimmed = query.trim().toLowerCase();
    return trimmed.isEmpty || value.toLowerCase().contains(trimmed);
  }

  bool _inRange(double? value, double? min, double? max) {
    if (min == null && max == null) return true;
    if (value == null) return false;
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
  }

  String _firstText(List<String?> values) {
    for (final value in values) {
      if (value != null && value.trim().isNotEmpty) return value.trim();
    }
    return '-';
  }

  int _naturalCompare(String a, String b) {
    final aNum = num.tryParse(a);
    final bNum = num.tryParse(b);
    if (aNum != null && bNum != null) return aNum.compareTo(bNum);
    return a.compareTo(b);
  }
}
