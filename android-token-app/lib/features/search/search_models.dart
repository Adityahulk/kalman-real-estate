import '../../data/app_database.dart';

enum SearchPaymentStatus { any, received, pending }

class SearchFilters {
  const SearchFilters({
    this.plotQuery = '',
    this.customerQuery = '',
    this.channelPartnerQuery = '',
    this.areaMin,
    this.areaMax,
    this.rateMin,
    this.rateMax,
    this.paymentStatus = SearchPaymentStatus.any,
    this.paymentStages = const {},
  });

  final String plotQuery;
  final String customerQuery;
  final String channelPartnerQuery;
  final double? areaMin;
  final double? areaMax;
  final double? rateMin;
  final double? rateMax;
  final SearchPaymentStatus paymentStatus;
  final Set<String> paymentStages;

  SearchFilters copyWith({
    String? plotQuery,
    String? customerQuery,
    String? channelPartnerQuery,
    double? areaMin,
    double? areaMax,
    double? rateMin,
    double? rateMax,
    bool clearAreaMin = false,
    bool clearAreaMax = false,
    bool clearRateMin = false,
    bool clearRateMax = false,
    SearchPaymentStatus? paymentStatus,
    Set<String>? paymentStages,
  }) {
    return SearchFilters(
      plotQuery: plotQuery ?? this.plotQuery,
      customerQuery: customerQuery ?? this.customerQuery,
      channelPartnerQuery: channelPartnerQuery ?? this.channelPartnerQuery,
      areaMin: clearAreaMin ? null : areaMin ?? this.areaMin,
      areaMax: clearAreaMax ? null : areaMax ?? this.areaMax,
      rateMin: clearRateMin ? null : rateMin ?? this.rateMin,
      rateMax: clearRateMax ? null : rateMax ?? this.rateMax,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentStages: paymentStages ?? this.paymentStages,
    );
  }

  String describe() {
    final parts = <String>[];
    if (plotQuery.trim().isNotEmpty) parts.add('Plot: $plotQuery');
    if (customerQuery.trim().isNotEmpty) parts.add('Customer: $customerQuery');
    if (channelPartnerQuery.trim().isNotEmpty) parts.add('CP: $channelPartnerQuery');
    if (areaMin != null || areaMax != null) parts.add('Area: ${areaMin ?? '-'} to ${areaMax ?? '-'}');
    if (rateMin != null || rateMax != null) parts.add('Rate: ${rateMin ?? '-'} to ${rateMax ?? '-'}');
    if (paymentStatus != SearchPaymentStatus.any) parts.add('Payment: ${paymentStatus.name}');
    if (paymentStages.isNotEmpty) parts.add('Stages: ${paymentStages.map(PaymentStage.label).join(', ')}');
    return parts.isEmpty ? 'No filters' : parts.join(' | ');
  }
}

class SearchResult {
  const SearchResult({
    required this.plotId,
    required this.plotNumber,
    required this.customerName,
    required this.channelPartner,
    required this.areaSqYards,
    required this.ratePerSqYard,
    required this.totalAmount,
    required this.totalReceived,
    required this.totalPending,
    required this.stageDetails,
  });

  final int plotId;
  final String plotNumber;
  final String customerName;
  final String channelPartner;
  final double? areaSqYards;
  final double? ratePerSqYard;
  final double? totalAmount;
  final double totalReceived;
  final double? totalPending;
  final List<StagePaymentDetail> stageDetails;

  String stageSummary() {
    return stageDetails.map((stage) => '${stage.label}: ${stage.statusLabel}').join(' | ');
  }
}

class StagePaymentDetail {
  const StagePaymentDetail({
    required this.stage,
    required this.label,
    required this.expected,
    required this.received,
  });

  final String stage;
  final String label;
  final double? expected;
  final double received;

  double? get pending => expected == null ? null : (expected! - received).clamp(0, double.infinity).toDouble();

  bool get isReceived => expected == null ? received > 0 : received >= expected!;

  bool get isPending => expected != null && received < expected!;

  String get statusLabel {
    if (isPending) return 'Pending';
    if (isReceived) return 'Received';
    return 'No amount';
  }
}
