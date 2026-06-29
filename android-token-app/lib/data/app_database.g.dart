// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $ProjectsTable extends Projects with TableInfo<$ProjectsTable, Project> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProjectsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _launchStatusMeta =
      const VerificationMeta('launchStatus');
  @override
  late final GeneratedColumn<String> launchStatus = GeneratedColumn<String>(
      'launch_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(ProjectStatus.preLaunch));
  static const VerificationMeta _totalPlotsMeta =
      const VerificationMeta('totalPlots');
  @override
  late final GeneratedColumn<int> totalPlots = GeneratedColumn<int>(
      'total_plots', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns =>
      [id, name, launchStatus, totalPlots, createdAt, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'projects';
  @override
  VerificationContext validateIntegrity(Insertable<Project> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('launch_status')) {
      context.handle(
          _launchStatusMeta,
          launchStatus.isAcceptableOrUnknown(
              data['launch_status']!, _launchStatusMeta));
    }
    if (data.containsKey('total_plots')) {
      context.handle(
          _totalPlotsMeta,
          totalPlots.isAcceptableOrUnknown(
              data['total_plots']!, _totalPlotsMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Project map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Project(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      launchStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}launch_status'])!,
      totalPlots: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}total_plots'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $ProjectsTable createAlias(String alias) {
    return $ProjectsTable(attachedDatabase, alias);
  }
}

class Project extends DataClass implements Insertable<Project> {
  final int id;
  final String name;
  final String launchStatus;
  final int totalPlots;
  final DateTime createdAt;
  final DateTime updatedAt;
  const Project(
      {required this.id,
      required this.name,
      required this.launchStatus,
      required this.totalPlots,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['launch_status'] = Variable<String>(launchStatus);
    map['total_plots'] = Variable<int>(totalPlots);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  ProjectsCompanion toCompanion(bool nullToAbsent) {
    return ProjectsCompanion(
      id: Value(id),
      name: Value(name),
      launchStatus: Value(launchStatus),
      totalPlots: Value(totalPlots),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Project.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Project(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      launchStatus: serializer.fromJson<String>(json['launchStatus']),
      totalPlots: serializer.fromJson<int>(json['totalPlots']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'launchStatus': serializer.toJson<String>(launchStatus),
      'totalPlots': serializer.toJson<int>(totalPlots),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Project copyWith(
          {int? id,
          String? name,
          String? launchStatus,
          int? totalPlots,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Project(
        id: id ?? this.id,
        name: name ?? this.name,
        launchStatus: launchStatus ?? this.launchStatus,
        totalPlots: totalPlots ?? this.totalPlots,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Project copyWithCompanion(ProjectsCompanion data) {
    return Project(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      launchStatus: data.launchStatus.present
          ? data.launchStatus.value
          : this.launchStatus,
      totalPlots:
          data.totalPlots.present ? data.totalPlots.value : this.totalPlots,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Project(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('launchStatus: $launchStatus, ')
          ..write('totalPlots: $totalPlots, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, name, launchStatus, totalPlots, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Project &&
          other.id == this.id &&
          other.name == this.name &&
          other.launchStatus == this.launchStatus &&
          other.totalPlots == this.totalPlots &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class ProjectsCompanion extends UpdateCompanion<Project> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> launchStatus;
  final Value<int> totalPlots;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const ProjectsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.launchStatus = const Value.absent(),
    this.totalPlots = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  ProjectsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.launchStatus = const Value.absent(),
    this.totalPlots = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  }) : name = Value(name);
  static Insertable<Project> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? launchStatus,
    Expression<int>? totalPlots,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (launchStatus != null) 'launch_status': launchStatus,
      if (totalPlots != null) 'total_plots': totalPlots,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  ProjectsCompanion copyWith(
      {Value<int>? id,
      Value<String>? name,
      Value<String>? launchStatus,
      Value<int>? totalPlots,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt}) {
    return ProjectsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      launchStatus: launchStatus ?? this.launchStatus,
      totalPlots: totalPlots ?? this.totalPlots,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (launchStatus.present) {
      map['launch_status'] = Variable<String>(launchStatus.value);
    }
    if (totalPlots.present) {
      map['total_plots'] = Variable<int>(totalPlots.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProjectsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('launchStatus: $launchStatus, ')
          ..write('totalPlots: $totalPlots, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $BuyersTable extends Buyers with TableInfo<$BuyersTable, Buyer> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BuyersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _guardianNameMeta =
      const VerificationMeta('guardianName');
  @override
  late final GeneratedColumn<String> guardianName = GeneratedColumn<String>(
      'guardian_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _phoneMeta = const VerificationMeta('phone');
  @override
  late final GeneratedColumn<String> phone = GeneratedColumn<String>(
      'phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _channelPartnerMeta =
      const VerificationMeta('channelPartner');
  @override
  late final GeneratedColumn<String> channelPartner = GeneratedColumn<String>(
      'channel_partner', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        projectId,
        name,
        guardianName,
        address,
        phone,
        channelPartner,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'buyers';
  @override
  VerificationContext validateIntegrity(Insertable<Buyer> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('guardian_name')) {
      context.handle(
          _guardianNameMeta,
          guardianName.isAcceptableOrUnknown(
              data['guardian_name']!, _guardianNameMeta));
    }
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    }
    if (data.containsKey('phone')) {
      context.handle(
          _phoneMeta, phone.isAcceptableOrUnknown(data['phone']!, _phoneMeta));
    }
    if (data.containsKey('channel_partner')) {
      context.handle(
          _channelPartnerMeta,
          channelPartner.isAcceptableOrUnknown(
              data['channel_partner']!, _channelPartnerMeta));
    } else if (isInserting) {
      context.missing(_channelPartnerMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Buyer map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Buyer(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      guardianName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}guardian_name']),
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address']),
      phone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone']),
      channelPartner: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}channel_partner'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $BuyersTable createAlias(String alias) {
    return $BuyersTable(attachedDatabase, alias);
  }
}

class Buyer extends DataClass implements Insertable<Buyer> {
  final int id;
  final int projectId;
  final String name;
  final String? guardianName;
  final String? address;
  final String? phone;
  final String channelPartner;
  final DateTime createdAt;
  final DateTime updatedAt;
  const Buyer(
      {required this.id,
      required this.projectId,
      required this.name,
      this.guardianName,
      this.address,
      this.phone,
      required this.channelPartner,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || guardianName != null) {
      map['guardian_name'] = Variable<String>(guardianName);
    }
    if (!nullToAbsent || address != null) {
      map['address'] = Variable<String>(address);
    }
    if (!nullToAbsent || phone != null) {
      map['phone'] = Variable<String>(phone);
    }
    map['channel_partner'] = Variable<String>(channelPartner);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  BuyersCompanion toCompanion(bool nullToAbsent) {
    return BuyersCompanion(
      id: Value(id),
      projectId: Value(projectId),
      name: Value(name),
      guardianName: guardianName == null && nullToAbsent
          ? const Value.absent()
          : Value(guardianName),
      address: address == null && nullToAbsent
          ? const Value.absent()
          : Value(address),
      phone:
          phone == null && nullToAbsent ? const Value.absent() : Value(phone),
      channelPartner: Value(channelPartner),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Buyer.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Buyer(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      name: serializer.fromJson<String>(json['name']),
      guardianName: serializer.fromJson<String?>(json['guardianName']),
      address: serializer.fromJson<String?>(json['address']),
      phone: serializer.fromJson<String?>(json['phone']),
      channelPartner: serializer.fromJson<String>(json['channelPartner']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'name': serializer.toJson<String>(name),
      'guardianName': serializer.toJson<String?>(guardianName),
      'address': serializer.toJson<String?>(address),
      'phone': serializer.toJson<String?>(phone),
      'channelPartner': serializer.toJson<String>(channelPartner),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Buyer copyWith(
          {int? id,
          int? projectId,
          String? name,
          Value<String?> guardianName = const Value.absent(),
          Value<String?> address = const Value.absent(),
          Value<String?> phone = const Value.absent(),
          String? channelPartner,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Buyer(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        name: name ?? this.name,
        guardianName:
            guardianName.present ? guardianName.value : this.guardianName,
        address: address.present ? address.value : this.address,
        phone: phone.present ? phone.value : this.phone,
        channelPartner: channelPartner ?? this.channelPartner,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Buyer copyWithCompanion(BuyersCompanion data) {
    return Buyer(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      name: data.name.present ? data.name.value : this.name,
      guardianName: data.guardianName.present
          ? data.guardianName.value
          : this.guardianName,
      address: data.address.present ? data.address.value : this.address,
      phone: data.phone.present ? data.phone.value : this.phone,
      channelPartner: data.channelPartner.present
          ? data.channelPartner.value
          : this.channelPartner,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Buyer(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('name: $name, ')
          ..write('guardianName: $guardianName, ')
          ..write('address: $address, ')
          ..write('phone: $phone, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, projectId, name, guardianName, address,
      phone, channelPartner, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Buyer &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.name == this.name &&
          other.guardianName == this.guardianName &&
          other.address == this.address &&
          other.phone == this.phone &&
          other.channelPartner == this.channelPartner &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class BuyersCompanion extends UpdateCompanion<Buyer> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<String> name;
  final Value<String?> guardianName;
  final Value<String?> address;
  final Value<String?> phone;
  final Value<String> channelPartner;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const BuyersCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.name = const Value.absent(),
    this.guardianName = const Value.absent(),
    this.address = const Value.absent(),
    this.phone = const Value.absent(),
    this.channelPartner = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  BuyersCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    required String name,
    this.guardianName = const Value.absent(),
    this.address = const Value.absent(),
    this.phone = const Value.absent(),
    required String channelPartner,
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  })  : projectId = Value(projectId),
        name = Value(name),
        channelPartner = Value(channelPartner);
  static Insertable<Buyer> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<String>? name,
    Expression<String>? guardianName,
    Expression<String>? address,
    Expression<String>? phone,
    Expression<String>? channelPartner,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (name != null) 'name': name,
      if (guardianName != null) 'guardian_name': guardianName,
      if (address != null) 'address': address,
      if (phone != null) 'phone': phone,
      if (channelPartner != null) 'channel_partner': channelPartner,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  BuyersCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<String>? name,
      Value<String?>? guardianName,
      Value<String?>? address,
      Value<String?>? phone,
      Value<String>? channelPartner,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt}) {
    return BuyersCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      name: name ?? this.name,
      guardianName: guardianName ?? this.guardianName,
      address: address ?? this.address,
      phone: phone ?? this.phone,
      channelPartner: channelPartner ?? this.channelPartner,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (guardianName.present) {
      map['guardian_name'] = Variable<String>(guardianName.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (phone.present) {
      map['phone'] = Variable<String>(phone.value);
    }
    if (channelPartner.present) {
      map['channel_partner'] = Variable<String>(channelPartner.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BuyersCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('name: $name, ')
          ..write('guardianName: $guardianName, ')
          ..write('address: $address, ')
          ..write('phone: $phone, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $TokensTable extends Tokens with TableInfo<$TokensTable, Token> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TokensTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _buyerIdMeta =
      const VerificationMeta('buyerId');
  @override
  late final GeneratedColumn<int> buyerId = GeneratedColumn<int>(
      'buyer_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES buyers (id) ON DELETE CASCADE'));
  static const VerificationMeta _tokenCodeMeta =
      const VerificationMeta('tokenCode');
  @override
  late final GeneratedColumn<String> tokenCode = GeneratedColumn<String>(
      'token_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(TokenStatus.active));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns =>
      [id, projectId, buyerId, tokenCode, amount, status, createdAt, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tokens';
  @override
  VerificationContext validateIntegrity(Insertable<Token> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('buyer_id')) {
      context.handle(_buyerIdMeta,
          buyerId.isAcceptableOrUnknown(data['buyer_id']!, _buyerIdMeta));
    } else if (isInserting) {
      context.missing(_buyerIdMeta);
    }
    if (data.containsKey('token_code')) {
      context.handle(_tokenCodeMeta,
          tokenCode.isAcceptableOrUnknown(data['token_code']!, _tokenCodeMeta));
    } else if (isInserting) {
      context.missing(_tokenCodeMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {projectId, tokenCode},
      ];
  @override
  Token map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Token(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      buyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}buyer_id'])!,
      tokenCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}token_code'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $TokensTable createAlias(String alias) {
    return $TokensTable(attachedDatabase, alias);
  }
}

class Token extends DataClass implements Insertable<Token> {
  final int id;
  final int projectId;
  final int buyerId;
  final String tokenCode;
  final double amount;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  const Token(
      {required this.id,
      required this.projectId,
      required this.buyerId,
      required this.tokenCode,
      required this.amount,
      required this.status,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    map['buyer_id'] = Variable<int>(buyerId);
    map['token_code'] = Variable<String>(tokenCode);
    map['amount'] = Variable<double>(amount);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  TokensCompanion toCompanion(bool nullToAbsent) {
    return TokensCompanion(
      id: Value(id),
      projectId: Value(projectId),
      buyerId: Value(buyerId),
      tokenCode: Value(tokenCode),
      amount: Value(amount),
      status: Value(status),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Token.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Token(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      buyerId: serializer.fromJson<int>(json['buyerId']),
      tokenCode: serializer.fromJson<String>(json['tokenCode']),
      amount: serializer.fromJson<double>(json['amount']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'buyerId': serializer.toJson<int>(buyerId),
      'tokenCode': serializer.toJson<String>(tokenCode),
      'amount': serializer.toJson<double>(amount),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Token copyWith(
          {int? id,
          int? projectId,
          int? buyerId,
          String? tokenCode,
          double? amount,
          String? status,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Token(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        buyerId: buyerId ?? this.buyerId,
        tokenCode: tokenCode ?? this.tokenCode,
        amount: amount ?? this.amount,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Token copyWithCompanion(TokensCompanion data) {
    return Token(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      buyerId: data.buyerId.present ? data.buyerId.value : this.buyerId,
      tokenCode: data.tokenCode.present ? data.tokenCode.value : this.tokenCode,
      amount: data.amount.present ? data.amount.value : this.amount,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Token(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('buyerId: $buyerId, ')
          ..write('tokenCode: $tokenCode, ')
          ..write('amount: $amount, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, projectId, buyerId, tokenCode, amount, status, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Token &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.buyerId == this.buyerId &&
          other.tokenCode == this.tokenCode &&
          other.amount == this.amount &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class TokensCompanion extends UpdateCompanion<Token> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<int> buyerId;
  final Value<String> tokenCode;
  final Value<double> amount;
  final Value<String> status;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const TokensCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.buyerId = const Value.absent(),
    this.tokenCode = const Value.absent(),
    this.amount = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  TokensCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    required int buyerId,
    required String tokenCode,
    required double amount,
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  })  : projectId = Value(projectId),
        buyerId = Value(buyerId),
        tokenCode = Value(tokenCode),
        amount = Value(amount);
  static Insertable<Token> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<int>? buyerId,
    Expression<String>? tokenCode,
    Expression<double>? amount,
    Expression<String>? status,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (buyerId != null) 'buyer_id': buyerId,
      if (tokenCode != null) 'token_code': tokenCode,
      if (amount != null) 'amount': amount,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  TokensCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<int>? buyerId,
      Value<String>? tokenCode,
      Value<double>? amount,
      Value<String>? status,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt}) {
    return TokensCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      buyerId: buyerId ?? this.buyerId,
      tokenCode: tokenCode ?? this.tokenCode,
      amount: amount ?? this.amount,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (buyerId.present) {
      map['buyer_id'] = Variable<int>(buyerId.value);
    }
    if (tokenCode.present) {
      map['token_code'] = Variable<String>(tokenCode.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TokensCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('buyerId: $buyerId, ')
          ..write('tokenCode: $tokenCode, ')
          ..write('amount: $amount, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $PlotsTable extends Plots with TableInfo<$PlotsTable, Plot> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PlotsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _plotNumberMeta =
      const VerificationMeta('plotNumber');
  @override
  late final GeneratedColumn<String> plotNumber = GeneratedColumn<String>(
      'plot_number', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _areaSqYardsMeta =
      const VerificationMeta('areaSqYards');
  @override
  late final GeneratedColumn<double> areaSqYards = GeneratedColumn<double>(
      'area_sq_yards', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _holderBuyerIdMeta =
      const VerificationMeta('holderBuyerId');
  @override
  late final GeneratedColumn<int> holderBuyerId = GeneratedColumn<int>(
      'holder_buyer_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES buyers (id) ON DELETE SET NULL'));
  static const VerificationMeta _assignedTokenIdMeta =
      const VerificationMeta('assignedTokenId');
  @override
  late final GeneratedColumn<int> assignedTokenId = GeneratedColumn<int>(
      'assigned_token_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES tokens (id) ON DELETE SET NULL'));
  static const VerificationMeta _channelPartnerMeta =
      const VerificationMeta('channelPartner');
  @override
  late final GeneratedColumn<String> channelPartner = GeneratedColumn<String>(
      'channel_partner', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(PlotStatus.empty));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        projectId,
        plotNumber,
        areaSqYards,
        holderBuyerId,
        assignedTokenId,
        channelPartner,
        status,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'plots';
  @override
  VerificationContext validateIntegrity(Insertable<Plot> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('plot_number')) {
      context.handle(
          _plotNumberMeta,
          plotNumber.isAcceptableOrUnknown(
              data['plot_number']!, _plotNumberMeta));
    } else if (isInserting) {
      context.missing(_plotNumberMeta);
    }
    if (data.containsKey('area_sq_yards')) {
      context.handle(
          _areaSqYardsMeta,
          areaSqYards.isAcceptableOrUnknown(
              data['area_sq_yards']!, _areaSqYardsMeta));
    }
    if (data.containsKey('holder_buyer_id')) {
      context.handle(
          _holderBuyerIdMeta,
          holderBuyerId.isAcceptableOrUnknown(
              data['holder_buyer_id']!, _holderBuyerIdMeta));
    }
    if (data.containsKey('assigned_token_id')) {
      context.handle(
          _assignedTokenIdMeta,
          assignedTokenId.isAcceptableOrUnknown(
              data['assigned_token_id']!, _assignedTokenIdMeta));
    }
    if (data.containsKey('channel_partner')) {
      context.handle(
          _channelPartnerMeta,
          channelPartner.isAcceptableOrUnknown(
              data['channel_partner']!, _channelPartnerMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {projectId, plotNumber},
      ];
  @override
  Plot map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Plot(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      plotNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}plot_number'])!,
      areaSqYards: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}area_sq_yards']),
      holderBuyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}holder_buyer_id']),
      assignedTokenId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}assigned_token_id']),
      channelPartner: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}channel_partner']),
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $PlotsTable createAlias(String alias) {
    return $PlotsTable(attachedDatabase, alias);
  }
}

class Plot extends DataClass implements Insertable<Plot> {
  final int id;
  final int projectId;
  final String plotNumber;
  final double? areaSqYards;
  final int? holderBuyerId;
  final int? assignedTokenId;
  final String? channelPartner;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  const Plot(
      {required this.id,
      required this.projectId,
      required this.plotNumber,
      this.areaSqYards,
      this.holderBuyerId,
      this.assignedTokenId,
      this.channelPartner,
      required this.status,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    map['plot_number'] = Variable<String>(plotNumber);
    if (!nullToAbsent || areaSqYards != null) {
      map['area_sq_yards'] = Variable<double>(areaSqYards);
    }
    if (!nullToAbsent || holderBuyerId != null) {
      map['holder_buyer_id'] = Variable<int>(holderBuyerId);
    }
    if (!nullToAbsent || assignedTokenId != null) {
      map['assigned_token_id'] = Variable<int>(assignedTokenId);
    }
    if (!nullToAbsent || channelPartner != null) {
      map['channel_partner'] = Variable<String>(channelPartner);
    }
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  PlotsCompanion toCompanion(bool nullToAbsent) {
    return PlotsCompanion(
      id: Value(id),
      projectId: Value(projectId),
      plotNumber: Value(plotNumber),
      areaSqYards: areaSqYards == null && nullToAbsent
          ? const Value.absent()
          : Value(areaSqYards),
      holderBuyerId: holderBuyerId == null && nullToAbsent
          ? const Value.absent()
          : Value(holderBuyerId),
      assignedTokenId: assignedTokenId == null && nullToAbsent
          ? const Value.absent()
          : Value(assignedTokenId),
      channelPartner: channelPartner == null && nullToAbsent
          ? const Value.absent()
          : Value(channelPartner),
      status: Value(status),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Plot.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Plot(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      plotNumber: serializer.fromJson<String>(json['plotNumber']),
      areaSqYards: serializer.fromJson<double?>(json['areaSqYards']),
      holderBuyerId: serializer.fromJson<int?>(json['holderBuyerId']),
      assignedTokenId: serializer.fromJson<int?>(json['assignedTokenId']),
      channelPartner: serializer.fromJson<String?>(json['channelPartner']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'plotNumber': serializer.toJson<String>(plotNumber),
      'areaSqYards': serializer.toJson<double?>(areaSqYards),
      'holderBuyerId': serializer.toJson<int?>(holderBuyerId),
      'assignedTokenId': serializer.toJson<int?>(assignedTokenId),
      'channelPartner': serializer.toJson<String?>(channelPartner),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Plot copyWith(
          {int? id,
          int? projectId,
          String? plotNumber,
          Value<double?> areaSqYards = const Value.absent(),
          Value<int?> holderBuyerId = const Value.absent(),
          Value<int?> assignedTokenId = const Value.absent(),
          Value<String?> channelPartner = const Value.absent(),
          String? status,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      Plot(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        plotNumber: plotNumber ?? this.plotNumber,
        areaSqYards: areaSqYards.present ? areaSqYards.value : this.areaSqYards,
        holderBuyerId:
            holderBuyerId.present ? holderBuyerId.value : this.holderBuyerId,
        assignedTokenId: assignedTokenId.present
            ? assignedTokenId.value
            : this.assignedTokenId,
        channelPartner:
            channelPartner.present ? channelPartner.value : this.channelPartner,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  Plot copyWithCompanion(PlotsCompanion data) {
    return Plot(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      plotNumber:
          data.plotNumber.present ? data.plotNumber.value : this.plotNumber,
      areaSqYards:
          data.areaSqYards.present ? data.areaSqYards.value : this.areaSqYards,
      holderBuyerId: data.holderBuyerId.present
          ? data.holderBuyerId.value
          : this.holderBuyerId,
      assignedTokenId: data.assignedTokenId.present
          ? data.assignedTokenId.value
          : this.assignedTokenId,
      channelPartner: data.channelPartner.present
          ? data.channelPartner.value
          : this.channelPartner,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Plot(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotNumber: $plotNumber, ')
          ..write('areaSqYards: $areaSqYards, ')
          ..write('holderBuyerId: $holderBuyerId, ')
          ..write('assignedTokenId: $assignedTokenId, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      projectId,
      plotNumber,
      areaSqYards,
      holderBuyerId,
      assignedTokenId,
      channelPartner,
      status,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Plot &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.plotNumber == this.plotNumber &&
          other.areaSqYards == this.areaSqYards &&
          other.holderBuyerId == this.holderBuyerId &&
          other.assignedTokenId == this.assignedTokenId &&
          other.channelPartner == this.channelPartner &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class PlotsCompanion extends UpdateCompanion<Plot> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<String> plotNumber;
  final Value<double?> areaSqYards;
  final Value<int?> holderBuyerId;
  final Value<int?> assignedTokenId;
  final Value<String?> channelPartner;
  final Value<String> status;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const PlotsCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.plotNumber = const Value.absent(),
    this.areaSqYards = const Value.absent(),
    this.holderBuyerId = const Value.absent(),
    this.assignedTokenId = const Value.absent(),
    this.channelPartner = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  PlotsCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    required String plotNumber,
    this.areaSqYards = const Value.absent(),
    this.holderBuyerId = const Value.absent(),
    this.assignedTokenId = const Value.absent(),
    this.channelPartner = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  })  : projectId = Value(projectId),
        plotNumber = Value(plotNumber);
  static Insertable<Plot> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<String>? plotNumber,
    Expression<double>? areaSqYards,
    Expression<int>? holderBuyerId,
    Expression<int>? assignedTokenId,
    Expression<String>? channelPartner,
    Expression<String>? status,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (plotNumber != null) 'plot_number': plotNumber,
      if (areaSqYards != null) 'area_sq_yards': areaSqYards,
      if (holderBuyerId != null) 'holder_buyer_id': holderBuyerId,
      if (assignedTokenId != null) 'assigned_token_id': assignedTokenId,
      if (channelPartner != null) 'channel_partner': channelPartner,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  PlotsCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<String>? plotNumber,
      Value<double?>? areaSqYards,
      Value<int?>? holderBuyerId,
      Value<int?>? assignedTokenId,
      Value<String?>? channelPartner,
      Value<String>? status,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt}) {
    return PlotsCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      plotNumber: plotNumber ?? this.plotNumber,
      areaSqYards: areaSqYards ?? this.areaSqYards,
      holderBuyerId: holderBuyerId ?? this.holderBuyerId,
      assignedTokenId: assignedTokenId ?? this.assignedTokenId,
      channelPartner: channelPartner ?? this.channelPartner,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (plotNumber.present) {
      map['plot_number'] = Variable<String>(plotNumber.value);
    }
    if (areaSqYards.present) {
      map['area_sq_yards'] = Variable<double>(areaSqYards.value);
    }
    if (holderBuyerId.present) {
      map['holder_buyer_id'] = Variable<int>(holderBuyerId.value);
    }
    if (assignedTokenId.present) {
      map['assigned_token_id'] = Variable<int>(assignedTokenId.value);
    }
    if (channelPartner.present) {
      map['channel_partner'] = Variable<String>(channelPartner.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PlotsCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotNumber: $plotNumber, ')
          ..write('areaSqYards: $areaSqYards, ')
          ..write('holderBuyerId: $holderBuyerId, ')
          ..write('assignedTokenId: $assignedTokenId, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $EoiFormsTable extends EoiForms with TableInfo<$EoiFormsTable, EoiForm> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EoiFormsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _plotIdMeta = const VerificationMeta('plotId');
  @override
  late final GeneratedColumn<int> plotId = GeneratedColumn<int>(
      'plot_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES plots (id) ON DELETE CASCADE'));
  static const VerificationMeta _buyerIdMeta =
      const VerificationMeta('buyerId');
  @override
  late final GeneratedColumn<int> buyerId = GeneratedColumn<int>(
      'buyer_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES buyers (id) ON DELETE SET NULL'));
  static const VerificationMeta _buyerNameMeta =
      const VerificationMeta('buyerName');
  @override
  late final GeneratedColumn<String> buyerName = GeneratedColumn<String>(
      'buyer_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _guardianNameMeta =
      const VerificationMeta('guardianName');
  @override
  late final GeneratedColumn<String> guardianName = GeneratedColumn<String>(
      'guardian_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _contactNoMeta =
      const VerificationMeta('contactNo');
  @override
  late final GeneratedColumn<String> contactNo = GeneratedColumn<String>(
      'contact_no', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _channelPartnerMeta =
      const VerificationMeta('channelPartner');
  @override
  late final GeneratedColumn<String> channelPartner = GeneratedColumn<String>(
      'channel_partner', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _plotNumberMeta =
      const VerificationMeta('plotNumber');
  @override
  late final GeneratedColumn<String> plotNumber = GeneratedColumn<String>(
      'plot_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _areaSqYardsMeta =
      const VerificationMeta('areaSqYards');
  @override
  late final GeneratedColumn<double> areaSqYards = GeneratedColumn<double>(
      'area_sq_yards', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _ratePerSqYardMeta =
      const VerificationMeta('ratePerSqYard');
  @override
  late final GeneratedColumn<double> ratePerSqYard = GeneratedColumn<double>(
      'rate_per_sq_yard', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _totalAmountMeta =
      const VerificationMeta('totalAmount');
  @override
  late final GeneratedColumn<double> totalAmount = GeneratedColumn<double>(
      'total_amount', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _ifmsChargesMeta =
      const VerificationMeta('ifmsCharges');
  @override
  late final GeneratedColumn<double> ifmsCharges = GeneratedColumn<double>(
      'ifms_charges', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _idcChargesMeta =
      const VerificationMeta('idcCharges');
  @override
  late final GeneratedColumn<double> idcCharges = GeneratedColumn<double>(
      'idc_charges', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _clubMembershipMeta =
      const VerificationMeta('clubMembership');
  @override
  late final GeneratedColumn<String> clubMembership = GeneratedColumn<String>(
      'club_membership', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
      'notes', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(defaultEoiNotes));
  static const VerificationMeta _plotDetailsEnabledMeta =
      const VerificationMeta('plotDetailsEnabled');
  @override
  late final GeneratedColumn<bool> plotDetailsEnabled = GeneratedColumn<bool>(
      'plot_details_enabled', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("plot_details_enabled" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        projectId,
        plotId,
        buyerId,
        buyerName,
        guardianName,
        address,
        contactNo,
        channelPartner,
        plotNumber,
        areaSqYards,
        ratePerSqYard,
        totalAmount,
        ifmsCharges,
        idcCharges,
        clubMembership,
        notes,
        plotDetailsEnabled,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'eoi_forms';
  @override
  VerificationContext validateIntegrity(Insertable<EoiForm> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('plot_id')) {
      context.handle(_plotIdMeta,
          plotId.isAcceptableOrUnknown(data['plot_id']!, _plotIdMeta));
    } else if (isInserting) {
      context.missing(_plotIdMeta);
    }
    if (data.containsKey('buyer_id')) {
      context.handle(_buyerIdMeta,
          buyerId.isAcceptableOrUnknown(data['buyer_id']!, _buyerIdMeta));
    }
    if (data.containsKey('buyer_name')) {
      context.handle(_buyerNameMeta,
          buyerName.isAcceptableOrUnknown(data['buyer_name']!, _buyerNameMeta));
    }
    if (data.containsKey('guardian_name')) {
      context.handle(
          _guardianNameMeta,
          guardianName.isAcceptableOrUnknown(
              data['guardian_name']!, _guardianNameMeta));
    }
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    }
    if (data.containsKey('contact_no')) {
      context.handle(_contactNoMeta,
          contactNo.isAcceptableOrUnknown(data['contact_no']!, _contactNoMeta));
    }
    if (data.containsKey('channel_partner')) {
      context.handle(
          _channelPartnerMeta,
          channelPartner.isAcceptableOrUnknown(
              data['channel_partner']!, _channelPartnerMeta));
    }
    if (data.containsKey('plot_number')) {
      context.handle(
          _plotNumberMeta,
          plotNumber.isAcceptableOrUnknown(
              data['plot_number']!, _plotNumberMeta));
    }
    if (data.containsKey('area_sq_yards')) {
      context.handle(
          _areaSqYardsMeta,
          areaSqYards.isAcceptableOrUnknown(
              data['area_sq_yards']!, _areaSqYardsMeta));
    }
    if (data.containsKey('rate_per_sq_yard')) {
      context.handle(
          _ratePerSqYardMeta,
          ratePerSqYard.isAcceptableOrUnknown(
              data['rate_per_sq_yard']!, _ratePerSqYardMeta));
    }
    if (data.containsKey('total_amount')) {
      context.handle(
          _totalAmountMeta,
          totalAmount.isAcceptableOrUnknown(
              data['total_amount']!, _totalAmountMeta));
    }
    if (data.containsKey('ifms_charges')) {
      context.handle(
          _ifmsChargesMeta,
          ifmsCharges.isAcceptableOrUnknown(
              data['ifms_charges']!, _ifmsChargesMeta));
    }
    if (data.containsKey('idc_charges')) {
      context.handle(
          _idcChargesMeta,
          idcCharges.isAcceptableOrUnknown(
              data['idc_charges']!, _idcChargesMeta));
    }
    if (data.containsKey('club_membership')) {
      context.handle(
          _clubMembershipMeta,
          clubMembership.isAcceptableOrUnknown(
              data['club_membership']!, _clubMembershipMeta));
    }
    if (data.containsKey('notes')) {
      context.handle(
          _notesMeta, notes.isAcceptableOrUnknown(data['notes']!, _notesMeta));
    }
    if (data.containsKey('plot_details_enabled')) {
      context.handle(
          _plotDetailsEnabledMeta,
          plotDetailsEnabled.isAcceptableOrUnknown(
              data['plot_details_enabled']!, _plotDetailsEnabledMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {plotId},
      ];
  @override
  EoiForm map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return EoiForm(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      plotId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}plot_id'])!,
      buyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}buyer_id']),
      buyerName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}buyer_name']),
      guardianName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}guardian_name']),
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address']),
      contactNo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}contact_no']),
      channelPartner: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}channel_partner']),
      plotNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}plot_number']),
      areaSqYards: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}area_sq_yards']),
      ratePerSqYard: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}rate_per_sq_yard']),
      totalAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_amount']),
      ifmsCharges: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}ifms_charges']),
      idcCharges: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}idc_charges']),
      clubMembership: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}club_membership']),
      notes: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}notes'])!,
      plotDetailsEnabled: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}plot_details_enabled'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $EoiFormsTable createAlias(String alias) {
    return $EoiFormsTable(attachedDatabase, alias);
  }
}

class EoiForm extends DataClass implements Insertable<EoiForm> {
  final int id;
  final int projectId;
  final int plotId;
  final int? buyerId;
  final String? buyerName;
  final String? guardianName;
  final String? address;
  final String? contactNo;
  final String? channelPartner;
  final String? plotNumber;
  final double? areaSqYards;
  final double? ratePerSqYard;
  final double? totalAmount;
  final double? ifmsCharges;
  final double? idcCharges;
  final String? clubMembership;
  final String notes;
  final bool plotDetailsEnabled;
  final DateTime createdAt;
  final DateTime updatedAt;
  const EoiForm(
      {required this.id,
      required this.projectId,
      required this.plotId,
      this.buyerId,
      this.buyerName,
      this.guardianName,
      this.address,
      this.contactNo,
      this.channelPartner,
      this.plotNumber,
      this.areaSqYards,
      this.ratePerSqYard,
      this.totalAmount,
      this.ifmsCharges,
      this.idcCharges,
      this.clubMembership,
      required this.notes,
      required this.plotDetailsEnabled,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    map['plot_id'] = Variable<int>(plotId);
    if (!nullToAbsent || buyerId != null) {
      map['buyer_id'] = Variable<int>(buyerId);
    }
    if (!nullToAbsent || buyerName != null) {
      map['buyer_name'] = Variable<String>(buyerName);
    }
    if (!nullToAbsent || guardianName != null) {
      map['guardian_name'] = Variable<String>(guardianName);
    }
    if (!nullToAbsent || address != null) {
      map['address'] = Variable<String>(address);
    }
    if (!nullToAbsent || contactNo != null) {
      map['contact_no'] = Variable<String>(contactNo);
    }
    if (!nullToAbsent || channelPartner != null) {
      map['channel_partner'] = Variable<String>(channelPartner);
    }
    if (!nullToAbsent || plotNumber != null) {
      map['plot_number'] = Variable<String>(plotNumber);
    }
    if (!nullToAbsent || areaSqYards != null) {
      map['area_sq_yards'] = Variable<double>(areaSqYards);
    }
    if (!nullToAbsent || ratePerSqYard != null) {
      map['rate_per_sq_yard'] = Variable<double>(ratePerSqYard);
    }
    if (!nullToAbsent || totalAmount != null) {
      map['total_amount'] = Variable<double>(totalAmount);
    }
    if (!nullToAbsent || ifmsCharges != null) {
      map['ifms_charges'] = Variable<double>(ifmsCharges);
    }
    if (!nullToAbsent || idcCharges != null) {
      map['idc_charges'] = Variable<double>(idcCharges);
    }
    if (!nullToAbsent || clubMembership != null) {
      map['club_membership'] = Variable<String>(clubMembership);
    }
    map['notes'] = Variable<String>(notes);
    map['plot_details_enabled'] = Variable<bool>(plotDetailsEnabled);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  EoiFormsCompanion toCompanion(bool nullToAbsent) {
    return EoiFormsCompanion(
      id: Value(id),
      projectId: Value(projectId),
      plotId: Value(plotId),
      buyerId: buyerId == null && nullToAbsent
          ? const Value.absent()
          : Value(buyerId),
      buyerName: buyerName == null && nullToAbsent
          ? const Value.absent()
          : Value(buyerName),
      guardianName: guardianName == null && nullToAbsent
          ? const Value.absent()
          : Value(guardianName),
      address: address == null && nullToAbsent
          ? const Value.absent()
          : Value(address),
      contactNo: contactNo == null && nullToAbsent
          ? const Value.absent()
          : Value(contactNo),
      channelPartner: channelPartner == null && nullToAbsent
          ? const Value.absent()
          : Value(channelPartner),
      plotNumber: plotNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(plotNumber),
      areaSqYards: areaSqYards == null && nullToAbsent
          ? const Value.absent()
          : Value(areaSqYards),
      ratePerSqYard: ratePerSqYard == null && nullToAbsent
          ? const Value.absent()
          : Value(ratePerSqYard),
      totalAmount: totalAmount == null && nullToAbsent
          ? const Value.absent()
          : Value(totalAmount),
      ifmsCharges: ifmsCharges == null && nullToAbsent
          ? const Value.absent()
          : Value(ifmsCharges),
      idcCharges: idcCharges == null && nullToAbsent
          ? const Value.absent()
          : Value(idcCharges),
      clubMembership: clubMembership == null && nullToAbsent
          ? const Value.absent()
          : Value(clubMembership),
      notes: Value(notes),
      plotDetailsEnabled: Value(plotDetailsEnabled),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory EoiForm.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return EoiForm(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      plotId: serializer.fromJson<int>(json['plotId']),
      buyerId: serializer.fromJson<int?>(json['buyerId']),
      buyerName: serializer.fromJson<String?>(json['buyerName']),
      guardianName: serializer.fromJson<String?>(json['guardianName']),
      address: serializer.fromJson<String?>(json['address']),
      contactNo: serializer.fromJson<String?>(json['contactNo']),
      channelPartner: serializer.fromJson<String?>(json['channelPartner']),
      plotNumber: serializer.fromJson<String?>(json['plotNumber']),
      areaSqYards: serializer.fromJson<double?>(json['areaSqYards']),
      ratePerSqYard: serializer.fromJson<double?>(json['ratePerSqYard']),
      totalAmount: serializer.fromJson<double?>(json['totalAmount']),
      ifmsCharges: serializer.fromJson<double?>(json['ifmsCharges']),
      idcCharges: serializer.fromJson<double?>(json['idcCharges']),
      clubMembership: serializer.fromJson<String?>(json['clubMembership']),
      notes: serializer.fromJson<String>(json['notes']),
      plotDetailsEnabled: serializer.fromJson<bool>(json['plotDetailsEnabled']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'plotId': serializer.toJson<int>(plotId),
      'buyerId': serializer.toJson<int?>(buyerId),
      'buyerName': serializer.toJson<String?>(buyerName),
      'guardianName': serializer.toJson<String?>(guardianName),
      'address': serializer.toJson<String?>(address),
      'contactNo': serializer.toJson<String?>(contactNo),
      'channelPartner': serializer.toJson<String?>(channelPartner),
      'plotNumber': serializer.toJson<String?>(plotNumber),
      'areaSqYards': serializer.toJson<double?>(areaSqYards),
      'ratePerSqYard': serializer.toJson<double?>(ratePerSqYard),
      'totalAmount': serializer.toJson<double?>(totalAmount),
      'ifmsCharges': serializer.toJson<double?>(ifmsCharges),
      'idcCharges': serializer.toJson<double?>(idcCharges),
      'clubMembership': serializer.toJson<String?>(clubMembership),
      'notes': serializer.toJson<String>(notes),
      'plotDetailsEnabled': serializer.toJson<bool>(plotDetailsEnabled),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  EoiForm copyWith(
          {int? id,
          int? projectId,
          int? plotId,
          Value<int?> buyerId = const Value.absent(),
          Value<String?> buyerName = const Value.absent(),
          Value<String?> guardianName = const Value.absent(),
          Value<String?> address = const Value.absent(),
          Value<String?> contactNo = const Value.absent(),
          Value<String?> channelPartner = const Value.absent(),
          Value<String?> plotNumber = const Value.absent(),
          Value<double?> areaSqYards = const Value.absent(),
          Value<double?> ratePerSqYard = const Value.absent(),
          Value<double?> totalAmount = const Value.absent(),
          Value<double?> ifmsCharges = const Value.absent(),
          Value<double?> idcCharges = const Value.absent(),
          Value<String?> clubMembership = const Value.absent(),
          String? notes,
          bool? plotDetailsEnabled,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      EoiForm(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        plotId: plotId ?? this.plotId,
        buyerId: buyerId.present ? buyerId.value : this.buyerId,
        buyerName: buyerName.present ? buyerName.value : this.buyerName,
        guardianName:
            guardianName.present ? guardianName.value : this.guardianName,
        address: address.present ? address.value : this.address,
        contactNo: contactNo.present ? contactNo.value : this.contactNo,
        channelPartner:
            channelPartner.present ? channelPartner.value : this.channelPartner,
        plotNumber: plotNumber.present ? plotNumber.value : this.plotNumber,
        areaSqYards: areaSqYards.present ? areaSqYards.value : this.areaSqYards,
        ratePerSqYard:
            ratePerSqYard.present ? ratePerSqYard.value : this.ratePerSqYard,
        totalAmount: totalAmount.present ? totalAmount.value : this.totalAmount,
        ifmsCharges: ifmsCharges.present ? ifmsCharges.value : this.ifmsCharges,
        idcCharges: idcCharges.present ? idcCharges.value : this.idcCharges,
        clubMembership:
            clubMembership.present ? clubMembership.value : this.clubMembership,
        notes: notes ?? this.notes,
        plotDetailsEnabled: plotDetailsEnabled ?? this.plotDetailsEnabled,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  EoiForm copyWithCompanion(EoiFormsCompanion data) {
    return EoiForm(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      plotId: data.plotId.present ? data.plotId.value : this.plotId,
      buyerId: data.buyerId.present ? data.buyerId.value : this.buyerId,
      buyerName: data.buyerName.present ? data.buyerName.value : this.buyerName,
      guardianName: data.guardianName.present
          ? data.guardianName.value
          : this.guardianName,
      address: data.address.present ? data.address.value : this.address,
      contactNo: data.contactNo.present ? data.contactNo.value : this.contactNo,
      channelPartner: data.channelPartner.present
          ? data.channelPartner.value
          : this.channelPartner,
      plotNumber:
          data.plotNumber.present ? data.plotNumber.value : this.plotNumber,
      areaSqYards:
          data.areaSqYards.present ? data.areaSqYards.value : this.areaSqYards,
      ratePerSqYard: data.ratePerSqYard.present
          ? data.ratePerSqYard.value
          : this.ratePerSqYard,
      totalAmount:
          data.totalAmount.present ? data.totalAmount.value : this.totalAmount,
      ifmsCharges:
          data.ifmsCharges.present ? data.ifmsCharges.value : this.ifmsCharges,
      idcCharges:
          data.idcCharges.present ? data.idcCharges.value : this.idcCharges,
      clubMembership: data.clubMembership.present
          ? data.clubMembership.value
          : this.clubMembership,
      notes: data.notes.present ? data.notes.value : this.notes,
      plotDetailsEnabled: data.plotDetailsEnabled.present
          ? data.plotDetailsEnabled.value
          : this.plotDetailsEnabled,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('EoiForm(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('buyerId: $buyerId, ')
          ..write('buyerName: $buyerName, ')
          ..write('guardianName: $guardianName, ')
          ..write('address: $address, ')
          ..write('contactNo: $contactNo, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('plotNumber: $plotNumber, ')
          ..write('areaSqYards: $areaSqYards, ')
          ..write('ratePerSqYard: $ratePerSqYard, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('ifmsCharges: $ifmsCharges, ')
          ..write('idcCharges: $idcCharges, ')
          ..write('clubMembership: $clubMembership, ')
          ..write('notes: $notes, ')
          ..write('plotDetailsEnabled: $plotDetailsEnabled, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      projectId,
      plotId,
      buyerId,
      buyerName,
      guardianName,
      address,
      contactNo,
      channelPartner,
      plotNumber,
      areaSqYards,
      ratePerSqYard,
      totalAmount,
      ifmsCharges,
      idcCharges,
      clubMembership,
      notes,
      plotDetailsEnabled,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is EoiForm &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.plotId == this.plotId &&
          other.buyerId == this.buyerId &&
          other.buyerName == this.buyerName &&
          other.guardianName == this.guardianName &&
          other.address == this.address &&
          other.contactNo == this.contactNo &&
          other.channelPartner == this.channelPartner &&
          other.plotNumber == this.plotNumber &&
          other.areaSqYards == this.areaSqYards &&
          other.ratePerSqYard == this.ratePerSqYard &&
          other.totalAmount == this.totalAmount &&
          other.ifmsCharges == this.ifmsCharges &&
          other.idcCharges == this.idcCharges &&
          other.clubMembership == this.clubMembership &&
          other.notes == this.notes &&
          other.plotDetailsEnabled == this.plotDetailsEnabled &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class EoiFormsCompanion extends UpdateCompanion<EoiForm> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<int> plotId;
  final Value<int?> buyerId;
  final Value<String?> buyerName;
  final Value<String?> guardianName;
  final Value<String?> address;
  final Value<String?> contactNo;
  final Value<String?> channelPartner;
  final Value<String?> plotNumber;
  final Value<double?> areaSqYards;
  final Value<double?> ratePerSqYard;
  final Value<double?> totalAmount;
  final Value<double?> ifmsCharges;
  final Value<double?> idcCharges;
  final Value<String?> clubMembership;
  final Value<String> notes;
  final Value<bool> plotDetailsEnabled;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const EoiFormsCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.plotId = const Value.absent(),
    this.buyerId = const Value.absent(),
    this.buyerName = const Value.absent(),
    this.guardianName = const Value.absent(),
    this.address = const Value.absent(),
    this.contactNo = const Value.absent(),
    this.channelPartner = const Value.absent(),
    this.plotNumber = const Value.absent(),
    this.areaSqYards = const Value.absent(),
    this.ratePerSqYard = const Value.absent(),
    this.totalAmount = const Value.absent(),
    this.ifmsCharges = const Value.absent(),
    this.idcCharges = const Value.absent(),
    this.clubMembership = const Value.absent(),
    this.notes = const Value.absent(),
    this.plotDetailsEnabled = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  EoiFormsCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    required int plotId,
    this.buyerId = const Value.absent(),
    this.buyerName = const Value.absent(),
    this.guardianName = const Value.absent(),
    this.address = const Value.absent(),
    this.contactNo = const Value.absent(),
    this.channelPartner = const Value.absent(),
    this.plotNumber = const Value.absent(),
    this.areaSqYards = const Value.absent(),
    this.ratePerSqYard = const Value.absent(),
    this.totalAmount = const Value.absent(),
    this.ifmsCharges = const Value.absent(),
    this.idcCharges = const Value.absent(),
    this.clubMembership = const Value.absent(),
    this.notes = const Value.absent(),
    this.plotDetailsEnabled = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  })  : projectId = Value(projectId),
        plotId = Value(plotId);
  static Insertable<EoiForm> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<int>? plotId,
    Expression<int>? buyerId,
    Expression<String>? buyerName,
    Expression<String>? guardianName,
    Expression<String>? address,
    Expression<String>? contactNo,
    Expression<String>? channelPartner,
    Expression<String>? plotNumber,
    Expression<double>? areaSqYards,
    Expression<double>? ratePerSqYard,
    Expression<double>? totalAmount,
    Expression<double>? ifmsCharges,
    Expression<double>? idcCharges,
    Expression<String>? clubMembership,
    Expression<String>? notes,
    Expression<bool>? plotDetailsEnabled,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (plotId != null) 'plot_id': plotId,
      if (buyerId != null) 'buyer_id': buyerId,
      if (buyerName != null) 'buyer_name': buyerName,
      if (guardianName != null) 'guardian_name': guardianName,
      if (address != null) 'address': address,
      if (contactNo != null) 'contact_no': contactNo,
      if (channelPartner != null) 'channel_partner': channelPartner,
      if (plotNumber != null) 'plot_number': plotNumber,
      if (areaSqYards != null) 'area_sq_yards': areaSqYards,
      if (ratePerSqYard != null) 'rate_per_sq_yard': ratePerSqYard,
      if (totalAmount != null) 'total_amount': totalAmount,
      if (ifmsCharges != null) 'ifms_charges': ifmsCharges,
      if (idcCharges != null) 'idc_charges': idcCharges,
      if (clubMembership != null) 'club_membership': clubMembership,
      if (notes != null) 'notes': notes,
      if (plotDetailsEnabled != null)
        'plot_details_enabled': plotDetailsEnabled,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  EoiFormsCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<int>? plotId,
      Value<int?>? buyerId,
      Value<String?>? buyerName,
      Value<String?>? guardianName,
      Value<String?>? address,
      Value<String?>? contactNo,
      Value<String?>? channelPartner,
      Value<String?>? plotNumber,
      Value<double?>? areaSqYards,
      Value<double?>? ratePerSqYard,
      Value<double?>? totalAmount,
      Value<double?>? ifmsCharges,
      Value<double?>? idcCharges,
      Value<String?>? clubMembership,
      Value<String>? notes,
      Value<bool>? plotDetailsEnabled,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt}) {
    return EoiFormsCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      plotId: plotId ?? this.plotId,
      buyerId: buyerId ?? this.buyerId,
      buyerName: buyerName ?? this.buyerName,
      guardianName: guardianName ?? this.guardianName,
      address: address ?? this.address,
      contactNo: contactNo ?? this.contactNo,
      channelPartner: channelPartner ?? this.channelPartner,
      plotNumber: plotNumber ?? this.plotNumber,
      areaSqYards: areaSqYards ?? this.areaSqYards,
      ratePerSqYard: ratePerSqYard ?? this.ratePerSqYard,
      totalAmount: totalAmount ?? this.totalAmount,
      ifmsCharges: ifmsCharges ?? this.ifmsCharges,
      idcCharges: idcCharges ?? this.idcCharges,
      clubMembership: clubMembership ?? this.clubMembership,
      notes: notes ?? this.notes,
      plotDetailsEnabled: plotDetailsEnabled ?? this.plotDetailsEnabled,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (plotId.present) {
      map['plot_id'] = Variable<int>(plotId.value);
    }
    if (buyerId.present) {
      map['buyer_id'] = Variable<int>(buyerId.value);
    }
    if (buyerName.present) {
      map['buyer_name'] = Variable<String>(buyerName.value);
    }
    if (guardianName.present) {
      map['guardian_name'] = Variable<String>(guardianName.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (contactNo.present) {
      map['contact_no'] = Variable<String>(contactNo.value);
    }
    if (channelPartner.present) {
      map['channel_partner'] = Variable<String>(channelPartner.value);
    }
    if (plotNumber.present) {
      map['plot_number'] = Variable<String>(plotNumber.value);
    }
    if (areaSqYards.present) {
      map['area_sq_yards'] = Variable<double>(areaSqYards.value);
    }
    if (ratePerSqYard.present) {
      map['rate_per_sq_yard'] = Variable<double>(ratePerSqYard.value);
    }
    if (totalAmount.present) {
      map['total_amount'] = Variable<double>(totalAmount.value);
    }
    if (ifmsCharges.present) {
      map['ifms_charges'] = Variable<double>(ifmsCharges.value);
    }
    if (idcCharges.present) {
      map['idc_charges'] = Variable<double>(idcCharges.value);
    }
    if (clubMembership.present) {
      map['club_membership'] = Variable<String>(clubMembership.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    if (plotDetailsEnabled.present) {
      map['plot_details_enabled'] = Variable<bool>(plotDetailsEnabled.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EoiFormsCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('buyerId: $buyerId, ')
          ..write('buyerName: $buyerName, ')
          ..write('guardianName: $guardianName, ')
          ..write('address: $address, ')
          ..write('contactNo: $contactNo, ')
          ..write('channelPartner: $channelPartner, ')
          ..write('plotNumber: $plotNumber, ')
          ..write('areaSqYards: $areaSqYards, ')
          ..write('ratePerSqYard: $ratePerSqYard, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('ifmsCharges: $ifmsCharges, ')
          ..write('idcCharges: $idcCharges, ')
          ..write('clubMembership: $clubMembership, ')
          ..write('notes: $notes, ')
          ..write('plotDetailsEnabled: $plotDetailsEnabled, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $PaymentSchedulesTable extends PaymentSchedules
    with TableInfo<$PaymentSchedulesTable, PaymentSchedule> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PaymentSchedulesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _plotIdMeta = const VerificationMeta('plotId');
  @override
  late final GeneratedColumn<int> plotId = GeneratedColumn<int>(
      'plot_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES plots (id) ON DELETE CASCADE'));
  static const VerificationMeta _stageKeyMeta =
      const VerificationMeta('stageKey');
  @override
  late final GeneratedColumn<String> stageKey = GeneratedColumn<String>(
      'stage_key', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _scheduleNameMeta =
      const VerificationMeta('scheduleName');
  @override
  late final GeneratedColumn<String> scheduleName = GeneratedColumn<String>(
      'schedule_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _percentageMeta =
      const VerificationMeta('percentage');
  @override
  late final GeneratedColumn<double> percentage = GeneratedColumn<double>(
      'percentage', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _dueDateMeta =
      const VerificationMeta('dueDate');
  @override
  late final GeneratedColumn<DateTime> dueDate = GeneratedColumn<DateTime>(
      'due_date', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(PaymentStatus.pending));
  @override
  List<GeneratedColumn> get $columns =>
      [id, plotId, stageKey, scheduleName, percentage, dueDate, amount, status];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'payment_schedules';
  @override
  VerificationContext validateIntegrity(Insertable<PaymentSchedule> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('plot_id')) {
      context.handle(_plotIdMeta,
          plotId.isAcceptableOrUnknown(data['plot_id']!, _plotIdMeta));
    } else if (isInserting) {
      context.missing(_plotIdMeta);
    }
    if (data.containsKey('stage_key')) {
      context.handle(_stageKeyMeta,
          stageKey.isAcceptableOrUnknown(data['stage_key']!, _stageKeyMeta));
    }
    if (data.containsKey('schedule_name')) {
      context.handle(
          _scheduleNameMeta,
          scheduleName.isAcceptableOrUnknown(
              data['schedule_name']!, _scheduleNameMeta));
    } else if (isInserting) {
      context.missing(_scheduleNameMeta);
    }
    if (data.containsKey('percentage')) {
      context.handle(
          _percentageMeta,
          percentage.isAcceptableOrUnknown(
              data['percentage']!, _percentageMeta));
    } else if (isInserting) {
      context.missing(_percentageMeta);
    }
    if (data.containsKey('due_date')) {
      context.handle(_dueDateMeta,
          dueDate.isAcceptableOrUnknown(data['due_date']!, _dueDateMeta));
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PaymentSchedule map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PaymentSchedule(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      plotId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}plot_id'])!,
      stageKey: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}stage_key']),
      scheduleName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}schedule_name'])!,
      percentage: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}percentage'])!,
      dueDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}due_date']),
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount']),
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
    );
  }

  @override
  $PaymentSchedulesTable createAlias(String alias) {
    return $PaymentSchedulesTable(attachedDatabase, alias);
  }
}

class PaymentSchedule extends DataClass implements Insertable<PaymentSchedule> {
  final int id;
  final int plotId;
  final String? stageKey;
  final String scheduleName;
  final double percentage;
  final DateTime? dueDate;
  final double? amount;
  final String status;
  const PaymentSchedule(
      {required this.id,
      required this.plotId,
      this.stageKey,
      required this.scheduleName,
      required this.percentage,
      this.dueDate,
      this.amount,
      required this.status});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['plot_id'] = Variable<int>(plotId);
    if (!nullToAbsent || stageKey != null) {
      map['stage_key'] = Variable<String>(stageKey);
    }
    map['schedule_name'] = Variable<String>(scheduleName);
    map['percentage'] = Variable<double>(percentage);
    if (!nullToAbsent || dueDate != null) {
      map['due_date'] = Variable<DateTime>(dueDate);
    }
    if (!nullToAbsent || amount != null) {
      map['amount'] = Variable<double>(amount);
    }
    map['status'] = Variable<String>(status);
    return map;
  }

  PaymentSchedulesCompanion toCompanion(bool nullToAbsent) {
    return PaymentSchedulesCompanion(
      id: Value(id),
      plotId: Value(plotId),
      stageKey: stageKey == null && nullToAbsent
          ? const Value.absent()
          : Value(stageKey),
      scheduleName: Value(scheduleName),
      percentage: Value(percentage),
      dueDate: dueDate == null && nullToAbsent
          ? const Value.absent()
          : Value(dueDate),
      amount:
          amount == null && nullToAbsent ? const Value.absent() : Value(amount),
      status: Value(status),
    );
  }

  factory PaymentSchedule.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PaymentSchedule(
      id: serializer.fromJson<int>(json['id']),
      plotId: serializer.fromJson<int>(json['plotId']),
      stageKey: serializer.fromJson<String?>(json['stageKey']),
      scheduleName: serializer.fromJson<String>(json['scheduleName']),
      percentage: serializer.fromJson<double>(json['percentage']),
      dueDate: serializer.fromJson<DateTime?>(json['dueDate']),
      amount: serializer.fromJson<double?>(json['amount']),
      status: serializer.fromJson<String>(json['status']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'plotId': serializer.toJson<int>(plotId),
      'stageKey': serializer.toJson<String?>(stageKey),
      'scheduleName': serializer.toJson<String>(scheduleName),
      'percentage': serializer.toJson<double>(percentage),
      'dueDate': serializer.toJson<DateTime?>(dueDate),
      'amount': serializer.toJson<double?>(amount),
      'status': serializer.toJson<String>(status),
    };
  }

  PaymentSchedule copyWith(
          {int? id,
          int? plotId,
          Value<String?> stageKey = const Value.absent(),
          String? scheduleName,
          double? percentage,
          Value<DateTime?> dueDate = const Value.absent(),
          Value<double?> amount = const Value.absent(),
          String? status}) =>
      PaymentSchedule(
        id: id ?? this.id,
        plotId: plotId ?? this.plotId,
        stageKey: stageKey.present ? stageKey.value : this.stageKey,
        scheduleName: scheduleName ?? this.scheduleName,
        percentage: percentage ?? this.percentage,
        dueDate: dueDate.present ? dueDate.value : this.dueDate,
        amount: amount.present ? amount.value : this.amount,
        status: status ?? this.status,
      );
  PaymentSchedule copyWithCompanion(PaymentSchedulesCompanion data) {
    return PaymentSchedule(
      id: data.id.present ? data.id.value : this.id,
      plotId: data.plotId.present ? data.plotId.value : this.plotId,
      stageKey: data.stageKey.present ? data.stageKey.value : this.stageKey,
      scheduleName: data.scheduleName.present
          ? data.scheduleName.value
          : this.scheduleName,
      percentage:
          data.percentage.present ? data.percentage.value : this.percentage,
      dueDate: data.dueDate.present ? data.dueDate.value : this.dueDate,
      amount: data.amount.present ? data.amount.value : this.amount,
      status: data.status.present ? data.status.value : this.status,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PaymentSchedule(')
          ..write('id: $id, ')
          ..write('plotId: $plotId, ')
          ..write('stageKey: $stageKey, ')
          ..write('scheduleName: $scheduleName, ')
          ..write('percentage: $percentage, ')
          ..write('dueDate: $dueDate, ')
          ..write('amount: $amount, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, plotId, stageKey, scheduleName, percentage, dueDate, amount, status);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PaymentSchedule &&
          other.id == this.id &&
          other.plotId == this.plotId &&
          other.stageKey == this.stageKey &&
          other.scheduleName == this.scheduleName &&
          other.percentage == this.percentage &&
          other.dueDate == this.dueDate &&
          other.amount == this.amount &&
          other.status == this.status);
}

class PaymentSchedulesCompanion extends UpdateCompanion<PaymentSchedule> {
  final Value<int> id;
  final Value<int> plotId;
  final Value<String?> stageKey;
  final Value<String> scheduleName;
  final Value<double> percentage;
  final Value<DateTime?> dueDate;
  final Value<double?> amount;
  final Value<String> status;
  const PaymentSchedulesCompanion({
    this.id = const Value.absent(),
    this.plotId = const Value.absent(),
    this.stageKey = const Value.absent(),
    this.scheduleName = const Value.absent(),
    this.percentage = const Value.absent(),
    this.dueDate = const Value.absent(),
    this.amount = const Value.absent(),
    this.status = const Value.absent(),
  });
  PaymentSchedulesCompanion.insert({
    this.id = const Value.absent(),
    required int plotId,
    this.stageKey = const Value.absent(),
    required String scheduleName,
    required double percentage,
    this.dueDate = const Value.absent(),
    this.amount = const Value.absent(),
    this.status = const Value.absent(),
  })  : plotId = Value(plotId),
        scheduleName = Value(scheduleName),
        percentage = Value(percentage);
  static Insertable<PaymentSchedule> custom({
    Expression<int>? id,
    Expression<int>? plotId,
    Expression<String>? stageKey,
    Expression<String>? scheduleName,
    Expression<double>? percentage,
    Expression<DateTime>? dueDate,
    Expression<double>? amount,
    Expression<String>? status,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (plotId != null) 'plot_id': plotId,
      if (stageKey != null) 'stage_key': stageKey,
      if (scheduleName != null) 'schedule_name': scheduleName,
      if (percentage != null) 'percentage': percentage,
      if (dueDate != null) 'due_date': dueDate,
      if (amount != null) 'amount': amount,
      if (status != null) 'status': status,
    });
  }

  PaymentSchedulesCompanion copyWith(
      {Value<int>? id,
      Value<int>? plotId,
      Value<String?>? stageKey,
      Value<String>? scheduleName,
      Value<double>? percentage,
      Value<DateTime?>? dueDate,
      Value<double?>? amount,
      Value<String>? status}) {
    return PaymentSchedulesCompanion(
      id: id ?? this.id,
      plotId: plotId ?? this.plotId,
      stageKey: stageKey ?? this.stageKey,
      scheduleName: scheduleName ?? this.scheduleName,
      percentage: percentage ?? this.percentage,
      dueDate: dueDate ?? this.dueDate,
      amount: amount ?? this.amount,
      status: status ?? this.status,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (plotId.present) {
      map['plot_id'] = Variable<int>(plotId.value);
    }
    if (stageKey.present) {
      map['stage_key'] = Variable<String>(stageKey.value);
    }
    if (scheduleName.present) {
      map['schedule_name'] = Variable<String>(scheduleName.value);
    }
    if (percentage.present) {
      map['percentage'] = Variable<double>(percentage.value);
    }
    if (dueDate.present) {
      map['due_date'] = Variable<DateTime>(dueDate.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PaymentSchedulesCompanion(')
          ..write('id: $id, ')
          ..write('plotId: $plotId, ')
          ..write('stageKey: $stageKey, ')
          ..write('scheduleName: $scheduleName, ')
          ..write('percentage: $percentage, ')
          ..write('dueDate: $dueDate, ')
          ..write('amount: $amount, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }
}

class $PaymentEntriesTable extends PaymentEntries
    with TableInfo<$PaymentEntriesTable, PaymentEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PaymentEntriesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _plotIdMeta = const VerificationMeta('plotId');
  @override
  late final GeneratedColumn<int> plotId = GeneratedColumn<int>(
      'plot_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES plots (id) ON DELETE SET NULL'));
  static const VerificationMeta _buyerIdMeta =
      const VerificationMeta('buyerId');
  @override
  late final GeneratedColumn<int> buyerId = GeneratedColumn<int>(
      'buyer_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES buyers (id) ON DELETE SET NULL'));
  static const VerificationMeta _tokenIdMeta =
      const VerificationMeta('tokenId');
  @override
  late final GeneratedColumn<int> tokenId = GeneratedColumn<int>(
      'token_id', aliasedName, true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES tokens (id) ON DELETE SET NULL'));
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<DateTime> date = GeneratedColumn<DateTime>(
      'date', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double,
      requiredDuringInsert: true,
      $customConstraints: 'NOT NULL CHECK (amount >= 0)');
  static const VerificationMeta _amountInWordsMeta =
      const VerificationMeta('amountInWords');
  @override
  late final GeneratedColumn<String> amountInWords = GeneratedColumn<String>(
      'amount_in_words', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _paymentTypeMeta =
      const VerificationMeta('paymentType');
  @override
  late final GeneratedColumn<String> paymentType = GeneratedColumn<String>(
      'payment_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _paymentStageMeta =
      const VerificationMeta('paymentStage');
  @override
  late final GeneratedColumn<String> paymentStage = GeneratedColumn<String>(
      'payment_stage', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _holderSignaturePathMeta =
      const VerificationMeta('holderSignaturePath');
  @override
  late final GeneratedColumn<String> holderSignaturePath =
      GeneratedColumn<String>('holder_signature_path', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _authorizedSignaturePathMeta =
      const VerificationMeta('authorizedSignaturePath');
  @override
  late final GeneratedColumn<String> authorizedSignaturePath =
      GeneratedColumn<String>('authorized_signature_path', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
      'note', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        projectId,
        plotId,
        buyerId,
        tokenId,
        date,
        amount,
        amountInWords,
        paymentType,
        paymentStage,
        holderSignaturePath,
        authorizedSignaturePath,
        note,
        createdAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'payment_entries';
  @override
  VerificationContext validateIntegrity(Insertable<PaymentEntry> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('plot_id')) {
      context.handle(_plotIdMeta,
          plotId.isAcceptableOrUnknown(data['plot_id']!, _plotIdMeta));
    }
    if (data.containsKey('buyer_id')) {
      context.handle(_buyerIdMeta,
          buyerId.isAcceptableOrUnknown(data['buyer_id']!, _buyerIdMeta));
    }
    if (data.containsKey('token_id')) {
      context.handle(_tokenIdMeta,
          tokenId.isAcceptableOrUnknown(data['token_id']!, _tokenIdMeta));
    }
    if (data.containsKey('date')) {
      context.handle(
          _dateMeta, date.isAcceptableOrUnknown(data['date']!, _dateMeta));
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('amount_in_words')) {
      context.handle(
          _amountInWordsMeta,
          amountInWords.isAcceptableOrUnknown(
              data['amount_in_words']!, _amountInWordsMeta));
    }
    if (data.containsKey('payment_type')) {
      context.handle(
          _paymentTypeMeta,
          paymentType.isAcceptableOrUnknown(
              data['payment_type']!, _paymentTypeMeta));
    } else if (isInserting) {
      context.missing(_paymentTypeMeta);
    }
    if (data.containsKey('payment_stage')) {
      context.handle(
          _paymentStageMeta,
          paymentStage.isAcceptableOrUnknown(
              data['payment_stage']!, _paymentStageMeta));
    }
    if (data.containsKey('holder_signature_path')) {
      context.handle(
          _holderSignaturePathMeta,
          holderSignaturePath.isAcceptableOrUnknown(
              data['holder_signature_path']!, _holderSignaturePathMeta));
    }
    if (data.containsKey('authorized_signature_path')) {
      context.handle(
          _authorizedSignaturePathMeta,
          authorizedSignaturePath.isAcceptableOrUnknown(
              data['authorized_signature_path']!,
              _authorizedSignaturePathMeta));
    }
    if (data.containsKey('note')) {
      context.handle(
          _noteMeta, note.isAcceptableOrUnknown(data['note']!, _noteMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PaymentEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PaymentEntry(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      plotId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}plot_id']),
      buyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}buyer_id']),
      tokenId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}token_id']),
      date: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}date'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      amountInWords: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}amount_in_words']),
      paymentType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payment_type'])!,
      paymentStage: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payment_stage']),
      holderSignaturePath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}holder_signature_path']),
      authorizedSignaturePath: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}authorized_signature_path']),
      note: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}note']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $PaymentEntriesTable createAlias(String alias) {
    return $PaymentEntriesTable(attachedDatabase, alias);
  }
}

class PaymentEntry extends DataClass implements Insertable<PaymentEntry> {
  final int id;
  final int projectId;
  final int? plotId;
  final int? buyerId;
  final int? tokenId;
  final DateTime date;
  final double amount;
  final String? amountInWords;
  final String paymentType;
  final String? paymentStage;
  final String? holderSignaturePath;
  final String? authorizedSignaturePath;
  final String? note;
  final DateTime createdAt;
  const PaymentEntry(
      {required this.id,
      required this.projectId,
      this.plotId,
      this.buyerId,
      this.tokenId,
      required this.date,
      required this.amount,
      this.amountInWords,
      required this.paymentType,
      this.paymentStage,
      this.holderSignaturePath,
      this.authorizedSignaturePath,
      this.note,
      required this.createdAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    if (!nullToAbsent || plotId != null) {
      map['plot_id'] = Variable<int>(plotId);
    }
    if (!nullToAbsent || buyerId != null) {
      map['buyer_id'] = Variable<int>(buyerId);
    }
    if (!nullToAbsent || tokenId != null) {
      map['token_id'] = Variable<int>(tokenId);
    }
    map['date'] = Variable<DateTime>(date);
    map['amount'] = Variable<double>(amount);
    if (!nullToAbsent || amountInWords != null) {
      map['amount_in_words'] = Variable<String>(amountInWords);
    }
    map['payment_type'] = Variable<String>(paymentType);
    if (!nullToAbsent || paymentStage != null) {
      map['payment_stage'] = Variable<String>(paymentStage);
    }
    if (!nullToAbsent || holderSignaturePath != null) {
      map['holder_signature_path'] = Variable<String>(holderSignaturePath);
    }
    if (!nullToAbsent || authorizedSignaturePath != null) {
      map['authorized_signature_path'] =
          Variable<String>(authorizedSignaturePath);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  PaymentEntriesCompanion toCompanion(bool nullToAbsent) {
    return PaymentEntriesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      plotId:
          plotId == null && nullToAbsent ? const Value.absent() : Value(plotId),
      buyerId: buyerId == null && nullToAbsent
          ? const Value.absent()
          : Value(buyerId),
      tokenId: tokenId == null && nullToAbsent
          ? const Value.absent()
          : Value(tokenId),
      date: Value(date),
      amount: Value(amount),
      amountInWords: amountInWords == null && nullToAbsent
          ? const Value.absent()
          : Value(amountInWords),
      paymentType: Value(paymentType),
      paymentStage: paymentStage == null && nullToAbsent
          ? const Value.absent()
          : Value(paymentStage),
      holderSignaturePath: holderSignaturePath == null && nullToAbsent
          ? const Value.absent()
          : Value(holderSignaturePath),
      authorizedSignaturePath: authorizedSignaturePath == null && nullToAbsent
          ? const Value.absent()
          : Value(authorizedSignaturePath),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      createdAt: Value(createdAt),
    );
  }

  factory PaymentEntry.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PaymentEntry(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      plotId: serializer.fromJson<int?>(json['plotId']),
      buyerId: serializer.fromJson<int?>(json['buyerId']),
      tokenId: serializer.fromJson<int?>(json['tokenId']),
      date: serializer.fromJson<DateTime>(json['date']),
      amount: serializer.fromJson<double>(json['amount']),
      amountInWords: serializer.fromJson<String?>(json['amountInWords']),
      paymentType: serializer.fromJson<String>(json['paymentType']),
      paymentStage: serializer.fromJson<String?>(json['paymentStage']),
      holderSignaturePath:
          serializer.fromJson<String?>(json['holderSignaturePath']),
      authorizedSignaturePath:
          serializer.fromJson<String?>(json['authorizedSignaturePath']),
      note: serializer.fromJson<String?>(json['note']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'plotId': serializer.toJson<int?>(plotId),
      'buyerId': serializer.toJson<int?>(buyerId),
      'tokenId': serializer.toJson<int?>(tokenId),
      'date': serializer.toJson<DateTime>(date),
      'amount': serializer.toJson<double>(amount),
      'amountInWords': serializer.toJson<String?>(amountInWords),
      'paymentType': serializer.toJson<String>(paymentType),
      'paymentStage': serializer.toJson<String?>(paymentStage),
      'holderSignaturePath': serializer.toJson<String?>(holderSignaturePath),
      'authorizedSignaturePath':
          serializer.toJson<String?>(authorizedSignaturePath),
      'note': serializer.toJson<String?>(note),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  PaymentEntry copyWith(
          {int? id,
          int? projectId,
          Value<int?> plotId = const Value.absent(),
          Value<int?> buyerId = const Value.absent(),
          Value<int?> tokenId = const Value.absent(),
          DateTime? date,
          double? amount,
          Value<String?> amountInWords = const Value.absent(),
          String? paymentType,
          Value<String?> paymentStage = const Value.absent(),
          Value<String?> holderSignaturePath = const Value.absent(),
          Value<String?> authorizedSignaturePath = const Value.absent(),
          Value<String?> note = const Value.absent(),
          DateTime? createdAt}) =>
      PaymentEntry(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        plotId: plotId.present ? plotId.value : this.plotId,
        buyerId: buyerId.present ? buyerId.value : this.buyerId,
        tokenId: tokenId.present ? tokenId.value : this.tokenId,
        date: date ?? this.date,
        amount: amount ?? this.amount,
        amountInWords:
            amountInWords.present ? amountInWords.value : this.amountInWords,
        paymentType: paymentType ?? this.paymentType,
        paymentStage:
            paymentStage.present ? paymentStage.value : this.paymentStage,
        holderSignaturePath: holderSignaturePath.present
            ? holderSignaturePath.value
            : this.holderSignaturePath,
        authorizedSignaturePath: authorizedSignaturePath.present
            ? authorizedSignaturePath.value
            : this.authorizedSignaturePath,
        note: note.present ? note.value : this.note,
        createdAt: createdAt ?? this.createdAt,
      );
  PaymentEntry copyWithCompanion(PaymentEntriesCompanion data) {
    return PaymentEntry(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      plotId: data.plotId.present ? data.plotId.value : this.plotId,
      buyerId: data.buyerId.present ? data.buyerId.value : this.buyerId,
      tokenId: data.tokenId.present ? data.tokenId.value : this.tokenId,
      date: data.date.present ? data.date.value : this.date,
      amount: data.amount.present ? data.amount.value : this.amount,
      amountInWords: data.amountInWords.present
          ? data.amountInWords.value
          : this.amountInWords,
      paymentType:
          data.paymentType.present ? data.paymentType.value : this.paymentType,
      paymentStage: data.paymentStage.present
          ? data.paymentStage.value
          : this.paymentStage,
      holderSignaturePath: data.holderSignaturePath.present
          ? data.holderSignaturePath.value
          : this.holderSignaturePath,
      authorizedSignaturePath: data.authorizedSignaturePath.present
          ? data.authorizedSignaturePath.value
          : this.authorizedSignaturePath,
      note: data.note.present ? data.note.value : this.note,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PaymentEntry(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('buyerId: $buyerId, ')
          ..write('tokenId: $tokenId, ')
          ..write('date: $date, ')
          ..write('amount: $amount, ')
          ..write('amountInWords: $amountInWords, ')
          ..write('paymentType: $paymentType, ')
          ..write('paymentStage: $paymentStage, ')
          ..write('holderSignaturePath: $holderSignaturePath, ')
          ..write('authorizedSignaturePath: $authorizedSignaturePath, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      projectId,
      plotId,
      buyerId,
      tokenId,
      date,
      amount,
      amountInWords,
      paymentType,
      paymentStage,
      holderSignaturePath,
      authorizedSignaturePath,
      note,
      createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PaymentEntry &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.plotId == this.plotId &&
          other.buyerId == this.buyerId &&
          other.tokenId == this.tokenId &&
          other.date == this.date &&
          other.amount == this.amount &&
          other.amountInWords == this.amountInWords &&
          other.paymentType == this.paymentType &&
          other.paymentStage == this.paymentStage &&
          other.holderSignaturePath == this.holderSignaturePath &&
          other.authorizedSignaturePath == this.authorizedSignaturePath &&
          other.note == this.note &&
          other.createdAt == this.createdAt);
}

class PaymentEntriesCompanion extends UpdateCompanion<PaymentEntry> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<int?> plotId;
  final Value<int?> buyerId;
  final Value<int?> tokenId;
  final Value<DateTime> date;
  final Value<double> amount;
  final Value<String?> amountInWords;
  final Value<String> paymentType;
  final Value<String?> paymentStage;
  final Value<String?> holderSignaturePath;
  final Value<String?> authorizedSignaturePath;
  final Value<String?> note;
  final Value<DateTime> createdAt;
  const PaymentEntriesCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.plotId = const Value.absent(),
    this.buyerId = const Value.absent(),
    this.tokenId = const Value.absent(),
    this.date = const Value.absent(),
    this.amount = const Value.absent(),
    this.amountInWords = const Value.absent(),
    this.paymentType = const Value.absent(),
    this.paymentStage = const Value.absent(),
    this.holderSignaturePath = const Value.absent(),
    this.authorizedSignaturePath = const Value.absent(),
    this.note = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  PaymentEntriesCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    this.plotId = const Value.absent(),
    this.buyerId = const Value.absent(),
    this.tokenId = const Value.absent(),
    required DateTime date,
    required double amount,
    this.amountInWords = const Value.absent(),
    required String paymentType,
    this.paymentStage = const Value.absent(),
    this.holderSignaturePath = const Value.absent(),
    this.authorizedSignaturePath = const Value.absent(),
    this.note = const Value.absent(),
    this.createdAt = const Value.absent(),
  })  : projectId = Value(projectId),
        date = Value(date),
        amount = Value(amount),
        paymentType = Value(paymentType);
  static Insertable<PaymentEntry> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<int>? plotId,
    Expression<int>? buyerId,
    Expression<int>? tokenId,
    Expression<DateTime>? date,
    Expression<double>? amount,
    Expression<String>? amountInWords,
    Expression<String>? paymentType,
    Expression<String>? paymentStage,
    Expression<String>? holderSignaturePath,
    Expression<String>? authorizedSignaturePath,
    Expression<String>? note,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (plotId != null) 'plot_id': plotId,
      if (buyerId != null) 'buyer_id': buyerId,
      if (tokenId != null) 'token_id': tokenId,
      if (date != null) 'date': date,
      if (amount != null) 'amount': amount,
      if (amountInWords != null) 'amount_in_words': amountInWords,
      if (paymentType != null) 'payment_type': paymentType,
      if (paymentStage != null) 'payment_stage': paymentStage,
      if (holderSignaturePath != null)
        'holder_signature_path': holderSignaturePath,
      if (authorizedSignaturePath != null)
        'authorized_signature_path': authorizedSignaturePath,
      if (note != null) 'note': note,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  PaymentEntriesCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<int?>? plotId,
      Value<int?>? buyerId,
      Value<int?>? tokenId,
      Value<DateTime>? date,
      Value<double>? amount,
      Value<String?>? amountInWords,
      Value<String>? paymentType,
      Value<String?>? paymentStage,
      Value<String?>? holderSignaturePath,
      Value<String?>? authorizedSignaturePath,
      Value<String?>? note,
      Value<DateTime>? createdAt}) {
    return PaymentEntriesCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      plotId: plotId ?? this.plotId,
      buyerId: buyerId ?? this.buyerId,
      tokenId: tokenId ?? this.tokenId,
      date: date ?? this.date,
      amount: amount ?? this.amount,
      amountInWords: amountInWords ?? this.amountInWords,
      paymentType: paymentType ?? this.paymentType,
      paymentStage: paymentStage ?? this.paymentStage,
      holderSignaturePath: holderSignaturePath ?? this.holderSignaturePath,
      authorizedSignaturePath:
          authorizedSignaturePath ?? this.authorizedSignaturePath,
      note: note ?? this.note,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (plotId.present) {
      map['plot_id'] = Variable<int>(plotId.value);
    }
    if (buyerId.present) {
      map['buyer_id'] = Variable<int>(buyerId.value);
    }
    if (tokenId.present) {
      map['token_id'] = Variable<int>(tokenId.value);
    }
    if (date.present) {
      map['date'] = Variable<DateTime>(date.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (amountInWords.present) {
      map['amount_in_words'] = Variable<String>(amountInWords.value);
    }
    if (paymentType.present) {
      map['payment_type'] = Variable<String>(paymentType.value);
    }
    if (paymentStage.present) {
      map['payment_stage'] = Variable<String>(paymentStage.value);
    }
    if (holderSignaturePath.present) {
      map['holder_signature_path'] =
          Variable<String>(holderSignaturePath.value);
    }
    if (authorizedSignaturePath.present) {
      map['authorized_signature_path'] =
          Variable<String>(authorizedSignaturePath.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PaymentEntriesCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('buyerId: $buyerId, ')
          ..write('tokenId: $tokenId, ')
          ..write('date: $date, ')
          ..write('amount: $amount, ')
          ..write('amountInWords: $amountInWords, ')
          ..write('paymentType: $paymentType, ')
          ..write('paymentStage: $paymentStage, ')
          ..write('holderSignaturePath: $holderSignaturePath, ')
          ..write('authorizedSignaturePath: $authorizedSignaturePath, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $PlotHistoryTable extends PlotHistory
    with TableInfo<$PlotHistoryTable, PlotHistoryData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PlotHistoryTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _projectIdMeta =
      const VerificationMeta('projectId');
  @override
  late final GeneratedColumn<int> projectId = GeneratedColumn<int>(
      'project_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES projects (id) ON DELETE CASCADE'));
  static const VerificationMeta _plotIdMeta = const VerificationMeta('plotId');
  @override
  late final GeneratedColumn<int> plotId = GeneratedColumn<int>(
      'plot_id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES plots (id) ON DELETE CASCADE'));
  static const VerificationMeta _actionTypeMeta =
      const VerificationMeta('actionType');
  @override
  late final GeneratedColumn<String> actionType = GeneratedColumn<String>(
      'action_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _oldBuyerIdMeta =
      const VerificationMeta('oldBuyerId');
  @override
  late final GeneratedColumn<int> oldBuyerId = GeneratedColumn<int>(
      'old_buyer_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _newBuyerIdMeta =
      const VerificationMeta('newBuyerId');
  @override
  late final GeneratedColumn<int> newBuyerId = GeneratedColumn<int>(
      'new_buyer_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _oldTokenIdMeta =
      const VerificationMeta('oldTokenId');
  @override
  late final GeneratedColumn<int> oldTokenId = GeneratedColumn<int>(
      'old_token_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _newTokenIdMeta =
      const VerificationMeta('newTokenId');
  @override
  late final GeneratedColumn<int> newTokenId = GeneratedColumn<int>(
      'new_token_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
      'note', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime,
      requiredDuringInsert: false,
      defaultValue: currentDateAndTime);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        projectId,
        plotId,
        actionType,
        oldBuyerId,
        newBuyerId,
        oldTokenId,
        newTokenId,
        amount,
        note,
        createdAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'plot_history';
  @override
  VerificationContext validateIntegrity(Insertable<PlotHistoryData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('project_id')) {
      context.handle(_projectIdMeta,
          projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta));
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('plot_id')) {
      context.handle(_plotIdMeta,
          plotId.isAcceptableOrUnknown(data['plot_id']!, _plotIdMeta));
    } else if (isInserting) {
      context.missing(_plotIdMeta);
    }
    if (data.containsKey('action_type')) {
      context.handle(
          _actionTypeMeta,
          actionType.isAcceptableOrUnknown(
              data['action_type']!, _actionTypeMeta));
    } else if (isInserting) {
      context.missing(_actionTypeMeta);
    }
    if (data.containsKey('old_buyer_id')) {
      context.handle(
          _oldBuyerIdMeta,
          oldBuyerId.isAcceptableOrUnknown(
              data['old_buyer_id']!, _oldBuyerIdMeta));
    }
    if (data.containsKey('new_buyer_id')) {
      context.handle(
          _newBuyerIdMeta,
          newBuyerId.isAcceptableOrUnknown(
              data['new_buyer_id']!, _newBuyerIdMeta));
    }
    if (data.containsKey('old_token_id')) {
      context.handle(
          _oldTokenIdMeta,
          oldTokenId.isAcceptableOrUnknown(
              data['old_token_id']!, _oldTokenIdMeta));
    }
    if (data.containsKey('new_token_id')) {
      context.handle(
          _newTokenIdMeta,
          newTokenId.isAcceptableOrUnknown(
              data['new_token_id']!, _newTokenIdMeta));
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    }
    if (data.containsKey('note')) {
      context.handle(
          _noteMeta, note.isAcceptableOrUnknown(data['note']!, _noteMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PlotHistoryData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PlotHistoryData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      projectId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}project_id'])!,
      plotId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}plot_id'])!,
      actionType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}action_type'])!,
      oldBuyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}old_buyer_id']),
      newBuyerId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}new_buyer_id']),
      oldTokenId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}old_token_id']),
      newTokenId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}new_token_id']),
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount']),
      note: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}note']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $PlotHistoryTable createAlias(String alias) {
    return $PlotHistoryTable(attachedDatabase, alias);
  }
}

class PlotHistoryData extends DataClass implements Insertable<PlotHistoryData> {
  final int id;
  final int projectId;
  final int plotId;
  final String actionType;
  final int? oldBuyerId;
  final int? newBuyerId;
  final int? oldTokenId;
  final int? newTokenId;
  final double? amount;
  final String? note;
  final DateTime createdAt;
  const PlotHistoryData(
      {required this.id,
      required this.projectId,
      required this.plotId,
      required this.actionType,
      this.oldBuyerId,
      this.newBuyerId,
      this.oldTokenId,
      this.newTokenId,
      this.amount,
      this.note,
      required this.createdAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['project_id'] = Variable<int>(projectId);
    map['plot_id'] = Variable<int>(plotId);
    map['action_type'] = Variable<String>(actionType);
    if (!nullToAbsent || oldBuyerId != null) {
      map['old_buyer_id'] = Variable<int>(oldBuyerId);
    }
    if (!nullToAbsent || newBuyerId != null) {
      map['new_buyer_id'] = Variable<int>(newBuyerId);
    }
    if (!nullToAbsent || oldTokenId != null) {
      map['old_token_id'] = Variable<int>(oldTokenId);
    }
    if (!nullToAbsent || newTokenId != null) {
      map['new_token_id'] = Variable<int>(newTokenId);
    }
    if (!nullToAbsent || amount != null) {
      map['amount'] = Variable<double>(amount);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  PlotHistoryCompanion toCompanion(bool nullToAbsent) {
    return PlotHistoryCompanion(
      id: Value(id),
      projectId: Value(projectId),
      plotId: Value(plotId),
      actionType: Value(actionType),
      oldBuyerId: oldBuyerId == null && nullToAbsent
          ? const Value.absent()
          : Value(oldBuyerId),
      newBuyerId: newBuyerId == null && nullToAbsent
          ? const Value.absent()
          : Value(newBuyerId),
      oldTokenId: oldTokenId == null && nullToAbsent
          ? const Value.absent()
          : Value(oldTokenId),
      newTokenId: newTokenId == null && nullToAbsent
          ? const Value.absent()
          : Value(newTokenId),
      amount:
          amount == null && nullToAbsent ? const Value.absent() : Value(amount),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      createdAt: Value(createdAt),
    );
  }

  factory PlotHistoryData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PlotHistoryData(
      id: serializer.fromJson<int>(json['id']),
      projectId: serializer.fromJson<int>(json['projectId']),
      plotId: serializer.fromJson<int>(json['plotId']),
      actionType: serializer.fromJson<String>(json['actionType']),
      oldBuyerId: serializer.fromJson<int?>(json['oldBuyerId']),
      newBuyerId: serializer.fromJson<int?>(json['newBuyerId']),
      oldTokenId: serializer.fromJson<int?>(json['oldTokenId']),
      newTokenId: serializer.fromJson<int?>(json['newTokenId']),
      amount: serializer.fromJson<double?>(json['amount']),
      note: serializer.fromJson<String?>(json['note']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'projectId': serializer.toJson<int>(projectId),
      'plotId': serializer.toJson<int>(plotId),
      'actionType': serializer.toJson<String>(actionType),
      'oldBuyerId': serializer.toJson<int?>(oldBuyerId),
      'newBuyerId': serializer.toJson<int?>(newBuyerId),
      'oldTokenId': serializer.toJson<int?>(oldTokenId),
      'newTokenId': serializer.toJson<int?>(newTokenId),
      'amount': serializer.toJson<double?>(amount),
      'note': serializer.toJson<String?>(note),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  PlotHistoryData copyWith(
          {int? id,
          int? projectId,
          int? plotId,
          String? actionType,
          Value<int?> oldBuyerId = const Value.absent(),
          Value<int?> newBuyerId = const Value.absent(),
          Value<int?> oldTokenId = const Value.absent(),
          Value<int?> newTokenId = const Value.absent(),
          Value<double?> amount = const Value.absent(),
          Value<String?> note = const Value.absent(),
          DateTime? createdAt}) =>
      PlotHistoryData(
        id: id ?? this.id,
        projectId: projectId ?? this.projectId,
        plotId: plotId ?? this.plotId,
        actionType: actionType ?? this.actionType,
        oldBuyerId: oldBuyerId.present ? oldBuyerId.value : this.oldBuyerId,
        newBuyerId: newBuyerId.present ? newBuyerId.value : this.newBuyerId,
        oldTokenId: oldTokenId.present ? oldTokenId.value : this.oldTokenId,
        newTokenId: newTokenId.present ? newTokenId.value : this.newTokenId,
        amount: amount.present ? amount.value : this.amount,
        note: note.present ? note.value : this.note,
        createdAt: createdAt ?? this.createdAt,
      );
  PlotHistoryData copyWithCompanion(PlotHistoryCompanion data) {
    return PlotHistoryData(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      plotId: data.plotId.present ? data.plotId.value : this.plotId,
      actionType:
          data.actionType.present ? data.actionType.value : this.actionType,
      oldBuyerId:
          data.oldBuyerId.present ? data.oldBuyerId.value : this.oldBuyerId,
      newBuyerId:
          data.newBuyerId.present ? data.newBuyerId.value : this.newBuyerId,
      oldTokenId:
          data.oldTokenId.present ? data.oldTokenId.value : this.oldTokenId,
      newTokenId:
          data.newTokenId.present ? data.newTokenId.value : this.newTokenId,
      amount: data.amount.present ? data.amount.value : this.amount,
      note: data.note.present ? data.note.value : this.note,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PlotHistoryData(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('actionType: $actionType, ')
          ..write('oldBuyerId: $oldBuyerId, ')
          ..write('newBuyerId: $newBuyerId, ')
          ..write('oldTokenId: $oldTokenId, ')
          ..write('newTokenId: $newTokenId, ')
          ..write('amount: $amount, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, projectId, plotId, actionType, oldBuyerId,
      newBuyerId, oldTokenId, newTokenId, amount, note, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PlotHistoryData &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.plotId == this.plotId &&
          other.actionType == this.actionType &&
          other.oldBuyerId == this.oldBuyerId &&
          other.newBuyerId == this.newBuyerId &&
          other.oldTokenId == this.oldTokenId &&
          other.newTokenId == this.newTokenId &&
          other.amount == this.amount &&
          other.note == this.note &&
          other.createdAt == this.createdAt);
}

class PlotHistoryCompanion extends UpdateCompanion<PlotHistoryData> {
  final Value<int> id;
  final Value<int> projectId;
  final Value<int> plotId;
  final Value<String> actionType;
  final Value<int?> oldBuyerId;
  final Value<int?> newBuyerId;
  final Value<int?> oldTokenId;
  final Value<int?> newTokenId;
  final Value<double?> amount;
  final Value<String?> note;
  final Value<DateTime> createdAt;
  const PlotHistoryCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.plotId = const Value.absent(),
    this.actionType = const Value.absent(),
    this.oldBuyerId = const Value.absent(),
    this.newBuyerId = const Value.absent(),
    this.oldTokenId = const Value.absent(),
    this.newTokenId = const Value.absent(),
    this.amount = const Value.absent(),
    this.note = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  PlotHistoryCompanion.insert({
    this.id = const Value.absent(),
    required int projectId,
    required int plotId,
    required String actionType,
    this.oldBuyerId = const Value.absent(),
    this.newBuyerId = const Value.absent(),
    this.oldTokenId = const Value.absent(),
    this.newTokenId = const Value.absent(),
    this.amount = const Value.absent(),
    this.note = const Value.absent(),
    this.createdAt = const Value.absent(),
  })  : projectId = Value(projectId),
        plotId = Value(plotId),
        actionType = Value(actionType);
  static Insertable<PlotHistoryData> custom({
    Expression<int>? id,
    Expression<int>? projectId,
    Expression<int>? plotId,
    Expression<String>? actionType,
    Expression<int>? oldBuyerId,
    Expression<int>? newBuyerId,
    Expression<int>? oldTokenId,
    Expression<int>? newTokenId,
    Expression<double>? amount,
    Expression<String>? note,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (plotId != null) 'plot_id': plotId,
      if (actionType != null) 'action_type': actionType,
      if (oldBuyerId != null) 'old_buyer_id': oldBuyerId,
      if (newBuyerId != null) 'new_buyer_id': newBuyerId,
      if (oldTokenId != null) 'old_token_id': oldTokenId,
      if (newTokenId != null) 'new_token_id': newTokenId,
      if (amount != null) 'amount': amount,
      if (note != null) 'note': note,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  PlotHistoryCompanion copyWith(
      {Value<int>? id,
      Value<int>? projectId,
      Value<int>? plotId,
      Value<String>? actionType,
      Value<int?>? oldBuyerId,
      Value<int?>? newBuyerId,
      Value<int?>? oldTokenId,
      Value<int?>? newTokenId,
      Value<double?>? amount,
      Value<String?>? note,
      Value<DateTime>? createdAt}) {
    return PlotHistoryCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      plotId: plotId ?? this.plotId,
      actionType: actionType ?? this.actionType,
      oldBuyerId: oldBuyerId ?? this.oldBuyerId,
      newBuyerId: newBuyerId ?? this.newBuyerId,
      oldTokenId: oldTokenId ?? this.oldTokenId,
      newTokenId: newTokenId ?? this.newTokenId,
      amount: amount ?? this.amount,
      note: note ?? this.note,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<int>(projectId.value);
    }
    if (plotId.present) {
      map['plot_id'] = Variable<int>(plotId.value);
    }
    if (actionType.present) {
      map['action_type'] = Variable<String>(actionType.value);
    }
    if (oldBuyerId.present) {
      map['old_buyer_id'] = Variable<int>(oldBuyerId.value);
    }
    if (newBuyerId.present) {
      map['new_buyer_id'] = Variable<int>(newBuyerId.value);
    }
    if (oldTokenId.present) {
      map['old_token_id'] = Variable<int>(oldTokenId.value);
    }
    if (newTokenId.present) {
      map['new_token_id'] = Variable<int>(newTokenId.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PlotHistoryCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('plotId: $plotId, ')
          ..write('actionType: $actionType, ')
          ..write('oldBuyerId: $oldBuyerId, ')
          ..write('newBuyerId: $newBuyerId, ')
          ..write('oldTokenId: $oldTokenId, ')
          ..write('newTokenId: $newTokenId, ')
          ..write('amount: $amount, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $AppSettingsTable extends AppSettings
    with TableInfo<$AppSettingsTable, AppSetting> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AppSettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
      'key', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
      'value', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [id, key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'app_settings';
  @override
  VerificationContext validateIntegrity(Insertable<AppSetting> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('key')) {
      context.handle(
          _keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
          _valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  AppSetting map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return AppSetting(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      key: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}value'])!,
    );
  }

  @override
  $AppSettingsTable createAlias(String alias) {
    return $AppSettingsTable(attachedDatabase, alias);
  }
}

class AppSetting extends DataClass implements Insertable<AppSetting> {
  final int id;
  final String key;
  final String value;
  const AppSetting({required this.id, required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  AppSettingsCompanion toCompanion(bool nullToAbsent) {
    return AppSettingsCompanion(
      id: Value(id),
      key: Value(key),
      value: Value(value),
    );
  }

  factory AppSetting.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return AppSetting(
      id: serializer.fromJson<int>(json['id']),
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  AppSetting copyWith({int? id, String? key, String? value}) => AppSetting(
        id: id ?? this.id,
        key: key ?? this.key,
        value: value ?? this.value,
      );
  AppSetting copyWithCompanion(AppSettingsCompanion data) {
    return AppSetting(
      id: data.id.present ? data.id.value : this.id,
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('AppSetting(')
          ..write('id: $id, ')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is AppSetting &&
          other.id == this.id &&
          other.key == this.key &&
          other.value == this.value);
}

class AppSettingsCompanion extends UpdateCompanion<AppSetting> {
  final Value<int> id;
  final Value<String> key;
  final Value<String> value;
  const AppSettingsCompanion({
    this.id = const Value.absent(),
    this.key = const Value.absent(),
    this.value = const Value.absent(),
  });
  AppSettingsCompanion.insert({
    this.id = const Value.absent(),
    required String key,
    required String value,
  })  : key = Value(key),
        value = Value(value);
  static Insertable<AppSetting> custom({
    Expression<int>? id,
    Expression<String>? key,
    Expression<String>? value,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (key != null) 'key': key,
      if (value != null) 'value': value,
    });
  }

  AppSettingsCompanion copyWith(
      {Value<int>? id, Value<String>? key, Value<String>? value}) {
    return AppSettingsCompanion(
      id: id ?? this.id,
      key: key ?? this.key,
      value: value ?? this.value,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AppSettingsCompanion(')
          ..write('id: $id, ')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $ProjectsTable projects = $ProjectsTable(this);
  late final $BuyersTable buyers = $BuyersTable(this);
  late final $TokensTable tokens = $TokensTable(this);
  late final $PlotsTable plots = $PlotsTable(this);
  late final $EoiFormsTable eoiForms = $EoiFormsTable(this);
  late final $PaymentSchedulesTable paymentSchedules =
      $PaymentSchedulesTable(this);
  late final $PaymentEntriesTable paymentEntries = $PaymentEntriesTable(this);
  late final $PlotHistoryTable plotHistory = $PlotHistoryTable(this);
  late final $AppSettingsTable appSettings = $AppSettingsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        projects,
        buyers,
        tokens,
        plots,
        eoiForms,
        paymentSchedules,
        paymentEntries,
        plotHistory,
        appSettings
      ];
  @override
  StreamQueryUpdateRules get streamUpdateRules => const StreamQueryUpdateRules(
        [
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('buyers', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('tokens', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('buyers',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('tokens', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('plots', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('buyers',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('plots', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('tokens',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('plots', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('eoi_forms', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('plots',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('eoi_forms', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('buyers',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('eoi_forms', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('plots',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('payment_schedules', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('payment_entries', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('plots',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('payment_entries', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('buyers',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('payment_entries', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('tokens',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('payment_entries', kind: UpdateKind.update),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('projects',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('plot_history', kind: UpdateKind.delete),
            ],
          ),
          WritePropagation(
            on: TableUpdateQuery.onTableName('plots',
                limitUpdateKind: UpdateKind.delete),
            result: [
              TableUpdate('plot_history', kind: UpdateKind.delete),
            ],
          ),
        ],
      );
}

typedef $$ProjectsTableCreateCompanionBuilder = ProjectsCompanion Function({
  Value<int> id,
  required String name,
  Value<String> launchStatus,
  Value<int> totalPlots,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});
typedef $$ProjectsTableUpdateCompanionBuilder = ProjectsCompanion Function({
  Value<int> id,
  Value<String> name,
  Value<String> launchStatus,
  Value<int> totalPlots,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});

final class $$ProjectsTableReferences
    extends BaseReferences<_$AppDatabase, $ProjectsTable, Project> {
  $$ProjectsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$BuyersTable, List<Buyer>> _buyersRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.buyers,
          aliasName: $_aliasNameGenerator(db.projects.id, db.buyers.projectId));

  $$BuyersTableProcessedTableManager get buyersRefs {
    final manager = $$BuyersTableTableManager($_db, $_db.buyers)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_buyersRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$TokensTable, List<Token>> _tokensRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.tokens,
          aliasName: $_aliasNameGenerator(db.projects.id, db.tokens.projectId));

  $$TokensTableProcessedTableManager get tokensRefs {
    final manager = $$TokensTableTableManager($_db, $_db.tokens)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_tokensRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PlotsTable, List<Plot>> _plotsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.plots,
          aliasName: $_aliasNameGenerator(db.projects.id, db.plots.projectId));

  $$PlotsTableProcessedTableManager get plotsRefs {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_plotsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$EoiFormsTable, List<EoiForm>> _eoiFormsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.eoiForms,
          aliasName:
              $_aliasNameGenerator(db.projects.id, db.eoiForms.projectId));

  $$EoiFormsTableProcessedTableManager get eoiFormsRefs {
    final manager = $$EoiFormsTableTableManager($_db, $_db.eoiForms)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_eoiFormsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PaymentEntriesTable, List<PaymentEntry>>
      _paymentEntriesRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.paymentEntries,
              aliasName: $_aliasNameGenerator(
                  db.projects.id, db.paymentEntries.projectId));

  $$PaymentEntriesTableProcessedTableManager get paymentEntriesRefs {
    final manager = $$PaymentEntriesTableTableManager($_db, $_db.paymentEntries)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_paymentEntriesRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PlotHistoryTable, List<PlotHistoryData>>
      _plotHistoryRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.plotHistory,
          aliasName:
              $_aliasNameGenerator(db.projects.id, db.plotHistory.projectId));

  $$PlotHistoryTableProcessedTableManager get plotHistoryRefs {
    final manager = $$PlotHistoryTableTableManager($_db, $_db.plotHistory)
        .filter((f) => f.projectId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_plotHistoryRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$ProjectsTableFilterComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get launchStatus => $composableBuilder(
      column: $table.launchStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalPlots => $composableBuilder(
      column: $table.totalPlots, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  Expression<bool> buyersRefs(
      Expression<bool> Function($$BuyersTableFilterComposer f) f) {
    final $$BuyersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableFilterComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> tokensRefs(
      Expression<bool> Function($$TokensTableFilterComposer f) f) {
    final $$TokensTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableFilterComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> plotsRefs(
      Expression<bool> Function($$PlotsTableFilterComposer f) f) {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> eoiFormsRefs(
      Expression<bool> Function($$EoiFormsTableFilterComposer f) f) {
    final $$EoiFormsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableFilterComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> paymentEntriesRefs(
      Expression<bool> Function($$PaymentEntriesTableFilterComposer f) f) {
    final $$PaymentEntriesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableFilterComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> plotHistoryRefs(
      Expression<bool> Function($$PlotHistoryTableFilterComposer f) f) {
    final $$PlotHistoryTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plotHistory,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotHistoryTableFilterComposer(
              $db: $db,
              $table: $db.plotHistory,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ProjectsTableOrderingComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get launchStatus => $composableBuilder(
      column: $table.launchStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalPlots => $composableBuilder(
      column: $table.totalPlots, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$ProjectsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get launchStatus => $composableBuilder(
      column: $table.launchStatus, builder: (column) => column);

  GeneratedColumn<int> get totalPlots => $composableBuilder(
      column: $table.totalPlots, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  Expression<T> buyersRefs<T extends Object>(
      Expression<T> Function($$BuyersTableAnnotationComposer a) f) {
    final $$BuyersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableAnnotationComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> tokensRefs<T extends Object>(
      Expression<T> Function($$TokensTableAnnotationComposer a) f) {
    final $$TokensTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableAnnotationComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> plotsRefs<T extends Object>(
      Expression<T> Function($$PlotsTableAnnotationComposer a) f) {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> eoiFormsRefs<T extends Object>(
      Expression<T> Function($$EoiFormsTableAnnotationComposer a) f) {
    final $$EoiFormsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableAnnotationComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> paymentEntriesRefs<T extends Object>(
      Expression<T> Function($$PaymentEntriesTableAnnotationComposer a) f) {
    final $$PaymentEntriesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableAnnotationComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> plotHistoryRefs<T extends Object>(
      Expression<T> Function($$PlotHistoryTableAnnotationComposer a) f) {
    final $$PlotHistoryTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plotHistory,
        getReferencedColumn: (t) => t.projectId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotHistoryTableAnnotationComposer(
              $db: $db,
              $table: $db.plotHistory,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$ProjectsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ProjectsTable,
    Project,
    $$ProjectsTableFilterComposer,
    $$ProjectsTableOrderingComposer,
    $$ProjectsTableAnnotationComposer,
    $$ProjectsTableCreateCompanionBuilder,
    $$ProjectsTableUpdateCompanionBuilder,
    (Project, $$ProjectsTableReferences),
    Project,
    PrefetchHooks Function(
        {bool buyersRefs,
        bool tokensRefs,
        bool plotsRefs,
        bool eoiFormsRefs,
        bool paymentEntriesRefs,
        bool plotHistoryRefs})> {
  $$ProjectsTableTableManager(_$AppDatabase db, $ProjectsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProjectsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProjectsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ProjectsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> launchStatus = const Value.absent(),
            Value<int> totalPlots = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              ProjectsCompanion(
            id: id,
            name: name,
            launchStatus: launchStatus,
            totalPlots: totalPlots,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String name,
            Value<String> launchStatus = const Value.absent(),
            Value<int> totalPlots = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              ProjectsCompanion.insert(
            id: id,
            name: name,
            launchStatus: launchStatus,
            totalPlots: totalPlots,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$ProjectsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {buyersRefs = false,
              tokensRefs = false,
              plotsRefs = false,
              eoiFormsRefs = false,
              paymentEntriesRefs = false,
              plotHistoryRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (buyersRefs) db.buyers,
                if (tokensRefs) db.tokens,
                if (plotsRefs) db.plots,
                if (eoiFormsRefs) db.eoiForms,
                if (paymentEntriesRefs) db.paymentEntries,
                if (plotHistoryRefs) db.plotHistory
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (buyersRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$ProjectsTableReferences._buyersRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0).buyersRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items),
                  if (tokensRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$ProjectsTableReferences._tokensRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0).tokensRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items),
                  if (plotsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$ProjectsTableReferences._plotsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0).plotsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items),
                  if (eoiFormsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$ProjectsTableReferences._eoiFormsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0)
                                .eoiFormsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items),
                  if (paymentEntriesRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable: $$ProjectsTableReferences
                            ._paymentEntriesRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0)
                                .paymentEntriesRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items),
                  if (plotHistoryRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$ProjectsTableReferences._plotHistoryRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$ProjectsTableReferences(db, table, p0)
                                .plotHistoryRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.projectId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$ProjectsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ProjectsTable,
    Project,
    $$ProjectsTableFilterComposer,
    $$ProjectsTableOrderingComposer,
    $$ProjectsTableAnnotationComposer,
    $$ProjectsTableCreateCompanionBuilder,
    $$ProjectsTableUpdateCompanionBuilder,
    (Project, $$ProjectsTableReferences),
    Project,
    PrefetchHooks Function(
        {bool buyersRefs,
        bool tokensRefs,
        bool plotsRefs,
        bool eoiFormsRefs,
        bool paymentEntriesRefs,
        bool plotHistoryRefs})>;
typedef $$BuyersTableCreateCompanionBuilder = BuyersCompanion Function({
  Value<int> id,
  required int projectId,
  required String name,
  Value<String?> guardianName,
  Value<String?> address,
  Value<String?> phone,
  required String channelPartner,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});
typedef $$BuyersTableUpdateCompanionBuilder = BuyersCompanion Function({
  Value<int> id,
  Value<int> projectId,
  Value<String> name,
  Value<String?> guardianName,
  Value<String?> address,
  Value<String?> phone,
  Value<String> channelPartner,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});

final class $$BuyersTableReferences
    extends BaseReferences<_$AppDatabase, $BuyersTable, Buyer> {
  $$BuyersTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) => db.projects
      .createAlias($_aliasNameGenerator(db.buyers.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$TokensTable, List<Token>> _tokensRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.tokens,
          aliasName: $_aliasNameGenerator(db.buyers.id, db.tokens.buyerId));

  $$TokensTableProcessedTableManager get tokensRefs {
    final manager = $$TokensTableTableManager($_db, $_db.tokens)
        .filter((f) => f.buyerId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_tokensRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PlotsTable, List<Plot>> _plotsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.plots,
          aliasName:
              $_aliasNameGenerator(db.buyers.id, db.plots.holderBuyerId));

  $$PlotsTableProcessedTableManager get plotsRefs {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.holderBuyerId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_plotsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$EoiFormsTable, List<EoiForm>> _eoiFormsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.eoiForms,
          aliasName: $_aliasNameGenerator(db.buyers.id, db.eoiForms.buyerId));

  $$EoiFormsTableProcessedTableManager get eoiFormsRefs {
    final manager = $$EoiFormsTableTableManager($_db, $_db.eoiForms)
        .filter((f) => f.buyerId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_eoiFormsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PaymentEntriesTable, List<PaymentEntry>>
      _paymentEntriesRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.paymentEntries,
              aliasName: $_aliasNameGenerator(
                  db.buyers.id, db.paymentEntries.buyerId));

  $$PaymentEntriesTableProcessedTableManager get paymentEntriesRefs {
    final manager = $$PaymentEntriesTableTableManager($_db, $_db.paymentEntries)
        .filter((f) => f.buyerId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_paymentEntriesRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$BuyersTableFilterComposer
    extends Composer<_$AppDatabase, $BuyersTable> {
  $$BuyersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get guardianName => $composableBuilder(
      column: $table.guardianName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> tokensRefs(
      Expression<bool> Function($$TokensTableFilterComposer f) f) {
    final $$TokensTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableFilterComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> plotsRefs(
      Expression<bool> Function($$PlotsTableFilterComposer f) f) {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.holderBuyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> eoiFormsRefs(
      Expression<bool> Function($$EoiFormsTableFilterComposer f) f) {
    final $$EoiFormsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableFilterComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> paymentEntriesRefs(
      Expression<bool> Function($$PaymentEntriesTableFilterComposer f) f) {
    final $$PaymentEntriesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableFilterComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$BuyersTableOrderingComposer
    extends Composer<_$AppDatabase, $BuyersTable> {
  $$BuyersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get guardianName => $composableBuilder(
      column: $table.guardianName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phone => $composableBuilder(
      column: $table.phone, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$BuyersTableAnnotationComposer
    extends Composer<_$AppDatabase, $BuyersTable> {
  $$BuyersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get guardianName => $composableBuilder(
      column: $table.guardianName, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get phone =>
      $composableBuilder(column: $table.phone, builder: (column) => column);

  GeneratedColumn<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> tokensRefs<T extends Object>(
      Expression<T> Function($$TokensTableAnnotationComposer a) f) {
    final $$TokensTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableAnnotationComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> plotsRefs<T extends Object>(
      Expression<T> Function($$PlotsTableAnnotationComposer a) f) {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.holderBuyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> eoiFormsRefs<T extends Object>(
      Expression<T> Function($$EoiFormsTableAnnotationComposer a) f) {
    final $$EoiFormsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableAnnotationComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> paymentEntriesRefs<T extends Object>(
      Expression<T> Function($$PaymentEntriesTableAnnotationComposer a) f) {
    final $$PaymentEntriesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.buyerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableAnnotationComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$BuyersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $BuyersTable,
    Buyer,
    $$BuyersTableFilterComposer,
    $$BuyersTableOrderingComposer,
    $$BuyersTableAnnotationComposer,
    $$BuyersTableCreateCompanionBuilder,
    $$BuyersTableUpdateCompanionBuilder,
    (Buyer, $$BuyersTableReferences),
    Buyer,
    PrefetchHooks Function(
        {bool projectId,
        bool tokensRefs,
        bool plotsRefs,
        bool eoiFormsRefs,
        bool paymentEntriesRefs})> {
  $$BuyersTableTableManager(_$AppDatabase db, $BuyersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BuyersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BuyersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BuyersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> guardianName = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> phone = const Value.absent(),
            Value<String> channelPartner = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              BuyersCompanion(
            id: id,
            projectId: projectId,
            name: name,
            guardianName: guardianName,
            address: address,
            phone: phone,
            channelPartner: channelPartner,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            required String name,
            Value<String?> guardianName = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> phone = const Value.absent(),
            required String channelPartner,
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              BuyersCompanion.insert(
            id: id,
            projectId: projectId,
            name: name,
            guardianName: guardianName,
            address: address,
            phone: phone,
            channelPartner: channelPartner,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$BuyersTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {projectId = false,
              tokensRefs = false,
              plotsRefs = false,
              eoiFormsRefs = false,
              paymentEntriesRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (tokensRefs) db.tokens,
                if (plotsRefs) db.plots,
                if (eoiFormsRefs) db.eoiForms,
                if (paymentEntriesRefs) db.paymentEntries
              ],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable:
                        $$BuyersTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$BuyersTableReferences._projectIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (tokensRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$BuyersTableReferences._tokensRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$BuyersTableReferences(db, table, p0).tokensRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.buyerId == item.id),
                        typedResults: items),
                  if (plotsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$BuyersTableReferences._plotsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$BuyersTableReferences(db, table, p0).plotsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.holderBuyerId == item.id),
                        typedResults: items),
                  if (eoiFormsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$BuyersTableReferences._eoiFormsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$BuyersTableReferences(db, table, p0).eoiFormsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.buyerId == item.id),
                        typedResults: items),
                  if (paymentEntriesRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable: $$BuyersTableReferences
                            ._paymentEntriesRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$BuyersTableReferences(db, table, p0)
                                .paymentEntriesRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.buyerId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$BuyersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $BuyersTable,
    Buyer,
    $$BuyersTableFilterComposer,
    $$BuyersTableOrderingComposer,
    $$BuyersTableAnnotationComposer,
    $$BuyersTableCreateCompanionBuilder,
    $$BuyersTableUpdateCompanionBuilder,
    (Buyer, $$BuyersTableReferences),
    Buyer,
    PrefetchHooks Function(
        {bool projectId,
        bool tokensRefs,
        bool plotsRefs,
        bool eoiFormsRefs,
        bool paymentEntriesRefs})>;
typedef $$TokensTableCreateCompanionBuilder = TokensCompanion Function({
  Value<int> id,
  required int projectId,
  required int buyerId,
  required String tokenCode,
  required double amount,
  Value<String> status,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});
typedef $$TokensTableUpdateCompanionBuilder = TokensCompanion Function({
  Value<int> id,
  Value<int> projectId,
  Value<int> buyerId,
  Value<String> tokenCode,
  Value<double> amount,
  Value<String> status,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});

final class $$TokensTableReferences
    extends BaseReferences<_$AppDatabase, $TokensTable, Token> {
  $$TokensTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) => db.projects
      .createAlias($_aliasNameGenerator(db.tokens.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $BuyersTable _buyerIdTable(_$AppDatabase db) => db.buyers
      .createAlias($_aliasNameGenerator(db.tokens.buyerId, db.buyers.id));

  $$BuyersTableProcessedTableManager get buyerId {
    final manager = $$BuyersTableTableManager($_db, $_db.buyers)
        .filter((f) => f.id($_item.buyerId));
    final item = $_typedResult.readTableOrNull(_buyerIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$PlotsTable, List<Plot>> _plotsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.plots,
          aliasName:
              $_aliasNameGenerator(db.tokens.id, db.plots.assignedTokenId));

  $$PlotsTableProcessedTableManager get plotsRefs {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.assignedTokenId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_plotsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PaymentEntriesTable, List<PaymentEntry>>
      _paymentEntriesRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.paymentEntries,
              aliasName: $_aliasNameGenerator(
                  db.tokens.id, db.paymentEntries.tokenId));

  $$PaymentEntriesTableProcessedTableManager get paymentEntriesRefs {
    final manager = $$PaymentEntriesTableTableManager($_db, $_db.paymentEntries)
        .filter((f) => f.tokenId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_paymentEntriesRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$TokensTableFilterComposer
    extends Composer<_$AppDatabase, $TokensTable> {
  $$TokensTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tokenCode => $composableBuilder(
      column: $table.tokenCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableFilterComposer get buyerId {
    final $$BuyersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableFilterComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> plotsRefs(
      Expression<bool> Function($$PlotsTableFilterComposer f) f) {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.assignedTokenId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> paymentEntriesRefs(
      Expression<bool> Function($$PaymentEntriesTableFilterComposer f) f) {
    final $$PaymentEntriesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.tokenId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableFilterComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TokensTableOrderingComposer
    extends Composer<_$AppDatabase, $TokensTable> {
  $$TokensTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tokenCode => $composableBuilder(
      column: $table.tokenCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableOrderingComposer get buyerId {
    final $$BuyersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableOrderingComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$TokensTableAnnotationComposer
    extends Composer<_$AppDatabase, $TokensTable> {
  $$TokensTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get tokenCode =>
      $composableBuilder(column: $table.tokenCode, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableAnnotationComposer get buyerId {
    final $$BuyersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableAnnotationComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> plotsRefs<T extends Object>(
      Expression<T> Function($$PlotsTableAnnotationComposer a) f) {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.assignedTokenId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> paymentEntriesRefs<T extends Object>(
      Expression<T> Function($$PaymentEntriesTableAnnotationComposer a) f) {
    final $$PaymentEntriesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.tokenId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableAnnotationComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$TokensTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TokensTable,
    Token,
    $$TokensTableFilterComposer,
    $$TokensTableOrderingComposer,
    $$TokensTableAnnotationComposer,
    $$TokensTableCreateCompanionBuilder,
    $$TokensTableUpdateCompanionBuilder,
    (Token, $$TokensTableReferences),
    Token,
    PrefetchHooks Function(
        {bool projectId,
        bool buyerId,
        bool plotsRefs,
        bool paymentEntriesRefs})> {
  $$TokensTableTableManager(_$AppDatabase db, $TokensTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TokensTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TokensTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TokensTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<int> buyerId = const Value.absent(),
            Value<String> tokenCode = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              TokensCompanion(
            id: id,
            projectId: projectId,
            buyerId: buyerId,
            tokenCode: tokenCode,
            amount: amount,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            required int buyerId,
            required String tokenCode,
            required double amount,
            Value<String> status = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              TokensCompanion.insert(
            id: id,
            projectId: projectId,
            buyerId: buyerId,
            tokenCode: tokenCode,
            amount: amount,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$TokensTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {projectId = false,
              buyerId = false,
              plotsRefs = false,
              paymentEntriesRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (plotsRefs) db.plots,
                if (paymentEntriesRefs) db.paymentEntries
              ],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable:
                        $$TokensTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$TokensTableReferences._projectIdTable(db).id,
                  ) as T;
                }
                if (buyerId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.buyerId,
                    referencedTable: $$TokensTableReferences._buyerIdTable(db),
                    referencedColumn:
                        $$TokensTableReferences._buyerIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (plotsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$TokensTableReferences._plotsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$TokensTableReferences(db, table, p0).plotsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.assignedTokenId == item.id),
                        typedResults: items),
                  if (paymentEntriesRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable: $$TokensTableReferences
                            ._paymentEntriesRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$TokensTableReferences(db, table, p0)
                                .paymentEntriesRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.tokenId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$TokensTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TokensTable,
    Token,
    $$TokensTableFilterComposer,
    $$TokensTableOrderingComposer,
    $$TokensTableAnnotationComposer,
    $$TokensTableCreateCompanionBuilder,
    $$TokensTableUpdateCompanionBuilder,
    (Token, $$TokensTableReferences),
    Token,
    PrefetchHooks Function(
        {bool projectId,
        bool buyerId,
        bool plotsRefs,
        bool paymentEntriesRefs})>;
typedef $$PlotsTableCreateCompanionBuilder = PlotsCompanion Function({
  Value<int> id,
  required int projectId,
  required String plotNumber,
  Value<double?> areaSqYards,
  Value<int?> holderBuyerId,
  Value<int?> assignedTokenId,
  Value<String?> channelPartner,
  Value<String> status,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});
typedef $$PlotsTableUpdateCompanionBuilder = PlotsCompanion Function({
  Value<int> id,
  Value<int> projectId,
  Value<String> plotNumber,
  Value<double?> areaSqYards,
  Value<int?> holderBuyerId,
  Value<int?> assignedTokenId,
  Value<String?> channelPartner,
  Value<String> status,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});

final class $$PlotsTableReferences
    extends BaseReferences<_$AppDatabase, $PlotsTable, Plot> {
  $$PlotsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) => db.projects
      .createAlias($_aliasNameGenerator(db.plots.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $BuyersTable _holderBuyerIdTable(_$AppDatabase db) => db.buyers
      .createAlias($_aliasNameGenerator(db.plots.holderBuyerId, db.buyers.id));

  $$BuyersTableProcessedTableManager? get holderBuyerId {
    if ($_item.holderBuyerId == null) return null;
    final manager = $$BuyersTableTableManager($_db, $_db.buyers)
        .filter((f) => f.id($_item.holderBuyerId!));
    final item = $_typedResult.readTableOrNull(_holderBuyerIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $TokensTable _assignedTokenIdTable(_$AppDatabase db) =>
      db.tokens.createAlias(
          $_aliasNameGenerator(db.plots.assignedTokenId, db.tokens.id));

  $$TokensTableProcessedTableManager? get assignedTokenId {
    if ($_item.assignedTokenId == null) return null;
    final manager = $$TokensTableTableManager($_db, $_db.tokens)
        .filter((f) => f.id($_item.assignedTokenId!));
    final item = $_typedResult.readTableOrNull(_assignedTokenIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$EoiFormsTable, List<EoiForm>> _eoiFormsRefsTable(
          _$AppDatabase db) =>
      MultiTypedResultKey.fromTable(db.eoiForms,
          aliasName: $_aliasNameGenerator(db.plots.id, db.eoiForms.plotId));

  $$EoiFormsTableProcessedTableManager get eoiFormsRefs {
    final manager = $$EoiFormsTableTableManager($_db, $_db.eoiForms)
        .filter((f) => f.plotId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_eoiFormsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PaymentSchedulesTable, List<PaymentSchedule>>
      _paymentSchedulesRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.paymentSchedules,
              aliasName: $_aliasNameGenerator(
                  db.plots.id, db.paymentSchedules.plotId));

  $$PaymentSchedulesTableProcessedTableManager get paymentSchedulesRefs {
    final manager =
        $$PaymentSchedulesTableTableManager($_db, $_db.paymentSchedules)
            .filter((f) => f.plotId.id($_item.id));

    final cache =
        $_typedResult.readTableOrNull(_paymentSchedulesRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PaymentEntriesTable, List<PaymentEntry>>
      _paymentEntriesRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.paymentEntries,
              aliasName:
                  $_aliasNameGenerator(db.plots.id, db.paymentEntries.plotId));

  $$PaymentEntriesTableProcessedTableManager get paymentEntriesRefs {
    final manager = $$PaymentEntriesTableTableManager($_db, $_db.paymentEntries)
        .filter((f) => f.plotId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_paymentEntriesRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$PlotHistoryTable, List<PlotHistoryData>>
      _plotHistoryRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
          db.plotHistory,
          aliasName: $_aliasNameGenerator(db.plots.id, db.plotHistory.plotId));

  $$PlotHistoryTableProcessedTableManager get plotHistoryRefs {
    final manager = $$PlotHistoryTableTableManager($_db, $_db.plotHistory)
        .filter((f) => f.plotId.id($_item.id));

    final cache = $_typedResult.readTableOrNull(_plotHistoryRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$PlotsTableFilterComposer extends Composer<_$AppDatabase, $PlotsTable> {
  $$PlotsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableFilterComposer get holderBuyerId {
    final $$BuyersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.holderBuyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableFilterComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableFilterComposer get assignedTokenId {
    final $$TokensTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.assignedTokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableFilterComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> eoiFormsRefs(
      Expression<bool> Function($$EoiFormsTableFilterComposer f) f) {
    final $$EoiFormsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableFilterComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> paymentSchedulesRefs(
      Expression<bool> Function($$PaymentSchedulesTableFilterComposer f) f) {
    final $$PaymentSchedulesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentSchedules,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentSchedulesTableFilterComposer(
              $db: $db,
              $table: $db.paymentSchedules,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> paymentEntriesRefs(
      Expression<bool> Function($$PaymentEntriesTableFilterComposer f) f) {
    final $$PaymentEntriesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableFilterComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> plotHistoryRefs(
      Expression<bool> Function($$PlotHistoryTableFilterComposer f) f) {
    final $$PlotHistoryTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plotHistory,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotHistoryTableFilterComposer(
              $db: $db,
              $table: $db.plotHistory,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$PlotsTableOrderingComposer
    extends Composer<_$AppDatabase, $PlotsTable> {
  $$PlotsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableOrderingComposer get holderBuyerId {
    final $$BuyersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.holderBuyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableOrderingComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableOrderingComposer get assignedTokenId {
    final $$TokensTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.assignedTokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableOrderingComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PlotsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PlotsTable> {
  $$PlotsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => column);

  GeneratedColumn<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => column);

  GeneratedColumn<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableAnnotationComposer get holderBuyerId {
    final $$BuyersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.holderBuyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableAnnotationComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableAnnotationComposer get assignedTokenId {
    final $$TokensTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.assignedTokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableAnnotationComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> eoiFormsRefs<T extends Object>(
      Expression<T> Function($$EoiFormsTableAnnotationComposer a) f) {
    final $$EoiFormsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.eoiForms,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$EoiFormsTableAnnotationComposer(
              $db: $db,
              $table: $db.eoiForms,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> paymentSchedulesRefs<T extends Object>(
      Expression<T> Function($$PaymentSchedulesTableAnnotationComposer a) f) {
    final $$PaymentSchedulesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentSchedules,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentSchedulesTableAnnotationComposer(
              $db: $db,
              $table: $db.paymentSchedules,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> paymentEntriesRefs<T extends Object>(
      Expression<T> Function($$PaymentEntriesTableAnnotationComposer a) f) {
    final $$PaymentEntriesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.paymentEntries,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PaymentEntriesTableAnnotationComposer(
              $db: $db,
              $table: $db.paymentEntries,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<T> plotHistoryRefs<T extends Object>(
      Expression<T> Function($$PlotHistoryTableAnnotationComposer a) f) {
    final $$PlotHistoryTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.plotHistory,
        getReferencedColumn: (t) => t.plotId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotHistoryTableAnnotationComposer(
              $db: $db,
              $table: $db.plotHistory,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$PlotsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PlotsTable,
    Plot,
    $$PlotsTableFilterComposer,
    $$PlotsTableOrderingComposer,
    $$PlotsTableAnnotationComposer,
    $$PlotsTableCreateCompanionBuilder,
    $$PlotsTableUpdateCompanionBuilder,
    (Plot, $$PlotsTableReferences),
    Plot,
    PrefetchHooks Function(
        {bool projectId,
        bool holderBuyerId,
        bool assignedTokenId,
        bool eoiFormsRefs,
        bool paymentSchedulesRefs,
        bool paymentEntriesRefs,
        bool plotHistoryRefs})> {
  $$PlotsTableTableManager(_$AppDatabase db, $PlotsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PlotsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PlotsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PlotsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<String> plotNumber = const Value.absent(),
            Value<double?> areaSqYards = const Value.absent(),
            Value<int?> holderBuyerId = const Value.absent(),
            Value<int?> assignedTokenId = const Value.absent(),
            Value<String?> channelPartner = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              PlotsCompanion(
            id: id,
            projectId: projectId,
            plotNumber: plotNumber,
            areaSqYards: areaSqYards,
            holderBuyerId: holderBuyerId,
            assignedTokenId: assignedTokenId,
            channelPartner: channelPartner,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            required String plotNumber,
            Value<double?> areaSqYards = const Value.absent(),
            Value<int?> holderBuyerId = const Value.absent(),
            Value<int?> assignedTokenId = const Value.absent(),
            Value<String?> channelPartner = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              PlotsCompanion.insert(
            id: id,
            projectId: projectId,
            plotNumber: plotNumber,
            areaSqYards: areaSqYards,
            holderBuyerId: holderBuyerId,
            assignedTokenId: assignedTokenId,
            channelPartner: channelPartner,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$PlotsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {projectId = false,
              holderBuyerId = false,
              assignedTokenId = false,
              eoiFormsRefs = false,
              paymentSchedulesRefs = false,
              paymentEntriesRefs = false,
              plotHistoryRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (eoiFormsRefs) db.eoiForms,
                if (paymentSchedulesRefs) db.paymentSchedules,
                if (paymentEntriesRefs) db.paymentEntries,
                if (plotHistoryRefs) db.plotHistory
              ],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable: $$PlotsTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$PlotsTableReferences._projectIdTable(db).id,
                  ) as T;
                }
                if (holderBuyerId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.holderBuyerId,
                    referencedTable:
                        $$PlotsTableReferences._holderBuyerIdTable(db),
                    referencedColumn:
                        $$PlotsTableReferences._holderBuyerIdTable(db).id,
                  ) as T;
                }
                if (assignedTokenId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.assignedTokenId,
                    referencedTable:
                        $$PlotsTableReferences._assignedTokenIdTable(db),
                    referencedColumn:
                        $$PlotsTableReferences._assignedTokenIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (eoiFormsRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$PlotsTableReferences._eoiFormsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$PlotsTableReferences(db, table, p0).eoiFormsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.plotId == item.id),
                        typedResults: items),
                  if (paymentSchedulesRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable: $$PlotsTableReferences
                            ._paymentSchedulesRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$PlotsTableReferences(db, table, p0)
                                .paymentSchedulesRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.plotId == item.id),
                        typedResults: items),
                  if (paymentEntriesRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$PlotsTableReferences._paymentEntriesRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$PlotsTableReferences(db, table, p0)
                                .paymentEntriesRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.plotId == item.id),
                        typedResults: items),
                  if (plotHistoryRefs)
                    await $_getPrefetchedData(
                        currentTable: table,
                        referencedTable:
                            $$PlotsTableReferences._plotHistoryRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$PlotsTableReferences(db, table, p0)
                                .plotHistoryRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.plotId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$PlotsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PlotsTable,
    Plot,
    $$PlotsTableFilterComposer,
    $$PlotsTableOrderingComposer,
    $$PlotsTableAnnotationComposer,
    $$PlotsTableCreateCompanionBuilder,
    $$PlotsTableUpdateCompanionBuilder,
    (Plot, $$PlotsTableReferences),
    Plot,
    PrefetchHooks Function(
        {bool projectId,
        bool holderBuyerId,
        bool assignedTokenId,
        bool eoiFormsRefs,
        bool paymentSchedulesRefs,
        bool paymentEntriesRefs,
        bool plotHistoryRefs})>;
typedef $$EoiFormsTableCreateCompanionBuilder = EoiFormsCompanion Function({
  Value<int> id,
  required int projectId,
  required int plotId,
  Value<int?> buyerId,
  Value<String?> buyerName,
  Value<String?> guardianName,
  Value<String?> address,
  Value<String?> contactNo,
  Value<String?> channelPartner,
  Value<String?> plotNumber,
  Value<double?> areaSqYards,
  Value<double?> ratePerSqYard,
  Value<double?> totalAmount,
  Value<double?> ifmsCharges,
  Value<double?> idcCharges,
  Value<String?> clubMembership,
  Value<String> notes,
  Value<bool> plotDetailsEnabled,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});
typedef $$EoiFormsTableUpdateCompanionBuilder = EoiFormsCompanion Function({
  Value<int> id,
  Value<int> projectId,
  Value<int> plotId,
  Value<int?> buyerId,
  Value<String?> buyerName,
  Value<String?> guardianName,
  Value<String?> address,
  Value<String?> contactNo,
  Value<String?> channelPartner,
  Value<String?> plotNumber,
  Value<double?> areaSqYards,
  Value<double?> ratePerSqYard,
  Value<double?> totalAmount,
  Value<double?> ifmsCharges,
  Value<double?> idcCharges,
  Value<String?> clubMembership,
  Value<String> notes,
  Value<bool> plotDetailsEnabled,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
});

final class $$EoiFormsTableReferences
    extends BaseReferences<_$AppDatabase, $EoiFormsTable, EoiForm> {
  $$EoiFormsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) => db.projects
      .createAlias($_aliasNameGenerator(db.eoiForms.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $PlotsTable _plotIdTable(_$AppDatabase db) => db.plots
      .createAlias($_aliasNameGenerator(db.eoiForms.plotId, db.plots.id));

  $$PlotsTableProcessedTableManager get plotId {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.id($_item.plotId));
    final item = $_typedResult.readTableOrNull(_plotIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $BuyersTable _buyerIdTable(_$AppDatabase db) => db.buyers
      .createAlias($_aliasNameGenerator(db.eoiForms.buyerId, db.buyers.id));

  $$BuyersTableProcessedTableManager? get buyerId {
    if ($_item.buyerId == null) return null;
    final manager = $$BuyersTableTableManager($_db, $_db.buyers)
        .filter((f) => f.id($_item.buyerId!));
    final item = $_typedResult.readTableOrNull(_buyerIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$EoiFormsTableFilterComposer
    extends Composer<_$AppDatabase, $EoiFormsTable> {
  $$EoiFormsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get buyerName => $composableBuilder(
      column: $table.buyerName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get guardianName => $composableBuilder(
      column: $table.guardianName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactNo => $composableBuilder(
      column: $table.contactNo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get ratePerSqYard => $composableBuilder(
      column: $table.ratePerSqYard, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get ifmsCharges => $composableBuilder(
      column: $table.ifmsCharges, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get idcCharges => $composableBuilder(
      column: $table.idcCharges, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get clubMembership => $composableBuilder(
      column: $table.clubMembership,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notes => $composableBuilder(
      column: $table.notes, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get plotDetailsEnabled => $composableBuilder(
      column: $table.plotDetailsEnabled,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableFilterComposer get plotId {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableFilterComposer get buyerId {
    final $$BuyersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableFilterComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$EoiFormsTableOrderingComposer
    extends Composer<_$AppDatabase, $EoiFormsTable> {
  $$EoiFormsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get buyerName => $composableBuilder(
      column: $table.buyerName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get guardianName => $composableBuilder(
      column: $table.guardianName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactNo => $composableBuilder(
      column: $table.contactNo, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get ratePerSqYard => $composableBuilder(
      column: $table.ratePerSqYard,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get ifmsCharges => $composableBuilder(
      column: $table.ifmsCharges, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get idcCharges => $composableBuilder(
      column: $table.idcCharges, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get clubMembership => $composableBuilder(
      column: $table.clubMembership,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notes => $composableBuilder(
      column: $table.notes, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get plotDetailsEnabled => $composableBuilder(
      column: $table.plotDetailsEnabled,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableOrderingComposer get plotId {
    final $$PlotsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableOrderingComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableOrderingComposer get buyerId {
    final $$BuyersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableOrderingComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$EoiFormsTableAnnotationComposer
    extends Composer<_$AppDatabase, $EoiFormsTable> {
  $$EoiFormsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get buyerName =>
      $composableBuilder(column: $table.buyerName, builder: (column) => column);

  GeneratedColumn<String> get guardianName => $composableBuilder(
      column: $table.guardianName, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get contactNo =>
      $composableBuilder(column: $table.contactNo, builder: (column) => column);

  GeneratedColumn<String> get channelPartner => $composableBuilder(
      column: $table.channelPartner, builder: (column) => column);

  GeneratedColumn<String> get plotNumber => $composableBuilder(
      column: $table.plotNumber, builder: (column) => column);

  GeneratedColumn<double> get areaSqYards => $composableBuilder(
      column: $table.areaSqYards, builder: (column) => column);

  GeneratedColumn<double> get ratePerSqYard => $composableBuilder(
      column: $table.ratePerSqYard, builder: (column) => column);

  GeneratedColumn<double> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => column);

  GeneratedColumn<double> get ifmsCharges => $composableBuilder(
      column: $table.ifmsCharges, builder: (column) => column);

  GeneratedColumn<double> get idcCharges => $composableBuilder(
      column: $table.idcCharges, builder: (column) => column);

  GeneratedColumn<String> get clubMembership => $composableBuilder(
      column: $table.clubMembership, builder: (column) => column);

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);

  GeneratedColumn<bool> get plotDetailsEnabled => $composableBuilder(
      column: $table.plotDetailsEnabled, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableAnnotationComposer get plotId {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableAnnotationComposer get buyerId {
    final $$BuyersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableAnnotationComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$EoiFormsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $EoiFormsTable,
    EoiForm,
    $$EoiFormsTableFilterComposer,
    $$EoiFormsTableOrderingComposer,
    $$EoiFormsTableAnnotationComposer,
    $$EoiFormsTableCreateCompanionBuilder,
    $$EoiFormsTableUpdateCompanionBuilder,
    (EoiForm, $$EoiFormsTableReferences),
    EoiForm,
    PrefetchHooks Function({bool projectId, bool plotId, bool buyerId})> {
  $$EoiFormsTableTableManager(_$AppDatabase db, $EoiFormsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EoiFormsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EoiFormsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EoiFormsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<int> plotId = const Value.absent(),
            Value<int?> buyerId = const Value.absent(),
            Value<String?> buyerName = const Value.absent(),
            Value<String?> guardianName = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> contactNo = const Value.absent(),
            Value<String?> channelPartner = const Value.absent(),
            Value<String?> plotNumber = const Value.absent(),
            Value<double?> areaSqYards = const Value.absent(),
            Value<double?> ratePerSqYard = const Value.absent(),
            Value<double?> totalAmount = const Value.absent(),
            Value<double?> ifmsCharges = const Value.absent(),
            Value<double?> idcCharges = const Value.absent(),
            Value<String?> clubMembership = const Value.absent(),
            Value<String> notes = const Value.absent(),
            Value<bool> plotDetailsEnabled = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              EoiFormsCompanion(
            id: id,
            projectId: projectId,
            plotId: plotId,
            buyerId: buyerId,
            buyerName: buyerName,
            guardianName: guardianName,
            address: address,
            contactNo: contactNo,
            channelPartner: channelPartner,
            plotNumber: plotNumber,
            areaSqYards: areaSqYards,
            ratePerSqYard: ratePerSqYard,
            totalAmount: totalAmount,
            ifmsCharges: ifmsCharges,
            idcCharges: idcCharges,
            clubMembership: clubMembership,
            notes: notes,
            plotDetailsEnabled: plotDetailsEnabled,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            required int plotId,
            Value<int?> buyerId = const Value.absent(),
            Value<String?> buyerName = const Value.absent(),
            Value<String?> guardianName = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<String?> contactNo = const Value.absent(),
            Value<String?> channelPartner = const Value.absent(),
            Value<String?> plotNumber = const Value.absent(),
            Value<double?> areaSqYards = const Value.absent(),
            Value<double?> ratePerSqYard = const Value.absent(),
            Value<double?> totalAmount = const Value.absent(),
            Value<double?> ifmsCharges = const Value.absent(),
            Value<double?> idcCharges = const Value.absent(),
            Value<String?> clubMembership = const Value.absent(),
            Value<String> notes = const Value.absent(),
            Value<bool> plotDetailsEnabled = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
          }) =>
              EoiFormsCompanion.insert(
            id: id,
            projectId: projectId,
            plotId: plotId,
            buyerId: buyerId,
            buyerName: buyerName,
            guardianName: guardianName,
            address: address,
            contactNo: contactNo,
            channelPartner: channelPartner,
            plotNumber: plotNumber,
            areaSqYards: areaSqYards,
            ratePerSqYard: ratePerSqYard,
            totalAmount: totalAmount,
            ifmsCharges: ifmsCharges,
            idcCharges: idcCharges,
            clubMembership: clubMembership,
            notes: notes,
            plotDetailsEnabled: plotDetailsEnabled,
            createdAt: createdAt,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$EoiFormsTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {projectId = false, plotId = false, buyerId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable:
                        $$EoiFormsTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$EoiFormsTableReferences._projectIdTable(db).id,
                  ) as T;
                }
                if (plotId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.plotId,
                    referencedTable: $$EoiFormsTableReferences._plotIdTable(db),
                    referencedColumn:
                        $$EoiFormsTableReferences._plotIdTable(db).id,
                  ) as T;
                }
                if (buyerId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.buyerId,
                    referencedTable:
                        $$EoiFormsTableReferences._buyerIdTable(db),
                    referencedColumn:
                        $$EoiFormsTableReferences._buyerIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$EoiFormsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $EoiFormsTable,
    EoiForm,
    $$EoiFormsTableFilterComposer,
    $$EoiFormsTableOrderingComposer,
    $$EoiFormsTableAnnotationComposer,
    $$EoiFormsTableCreateCompanionBuilder,
    $$EoiFormsTableUpdateCompanionBuilder,
    (EoiForm, $$EoiFormsTableReferences),
    EoiForm,
    PrefetchHooks Function({bool projectId, bool plotId, bool buyerId})>;
typedef $$PaymentSchedulesTableCreateCompanionBuilder
    = PaymentSchedulesCompanion Function({
  Value<int> id,
  required int plotId,
  Value<String?> stageKey,
  required String scheduleName,
  required double percentage,
  Value<DateTime?> dueDate,
  Value<double?> amount,
  Value<String> status,
});
typedef $$PaymentSchedulesTableUpdateCompanionBuilder
    = PaymentSchedulesCompanion Function({
  Value<int> id,
  Value<int> plotId,
  Value<String?> stageKey,
  Value<String> scheduleName,
  Value<double> percentage,
  Value<DateTime?> dueDate,
  Value<double?> amount,
  Value<String> status,
});

final class $$PaymentSchedulesTableReferences extends BaseReferences<
    _$AppDatabase, $PaymentSchedulesTable, PaymentSchedule> {
  $$PaymentSchedulesTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $PlotsTable _plotIdTable(_$AppDatabase db) => db.plots.createAlias(
      $_aliasNameGenerator(db.paymentSchedules.plotId, db.plots.id));

  $$PlotsTableProcessedTableManager get plotId {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.id($_item.plotId));
    final item = $_typedResult.readTableOrNull(_plotIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$PaymentSchedulesTableFilterComposer
    extends Composer<_$AppDatabase, $PaymentSchedulesTable> {
  $$PaymentSchedulesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get stageKey => $composableBuilder(
      column: $table.stageKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get scheduleName => $composableBuilder(
      column: $table.scheduleName, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get dueDate => $composableBuilder(
      column: $table.dueDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  $$PlotsTableFilterComposer get plotId {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentSchedulesTableOrderingComposer
    extends Composer<_$AppDatabase, $PaymentSchedulesTable> {
  $$PaymentSchedulesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get stageKey => $composableBuilder(
      column: $table.stageKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get scheduleName => $composableBuilder(
      column: $table.scheduleName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get dueDate => $composableBuilder(
      column: $table.dueDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  $$PlotsTableOrderingComposer get plotId {
    final $$PlotsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableOrderingComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentSchedulesTableAnnotationComposer
    extends Composer<_$AppDatabase, $PaymentSchedulesTable> {
  $$PaymentSchedulesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get stageKey =>
      $composableBuilder(column: $table.stageKey, builder: (column) => column);

  GeneratedColumn<String> get scheduleName => $composableBuilder(
      column: $table.scheduleName, builder: (column) => column);

  GeneratedColumn<double> get percentage => $composableBuilder(
      column: $table.percentage, builder: (column) => column);

  GeneratedColumn<DateTime> get dueDate =>
      $composableBuilder(column: $table.dueDate, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  $$PlotsTableAnnotationComposer get plotId {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentSchedulesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PaymentSchedulesTable,
    PaymentSchedule,
    $$PaymentSchedulesTableFilterComposer,
    $$PaymentSchedulesTableOrderingComposer,
    $$PaymentSchedulesTableAnnotationComposer,
    $$PaymentSchedulesTableCreateCompanionBuilder,
    $$PaymentSchedulesTableUpdateCompanionBuilder,
    (PaymentSchedule, $$PaymentSchedulesTableReferences),
    PaymentSchedule,
    PrefetchHooks Function({bool plotId})> {
  $$PaymentSchedulesTableTableManager(
      _$AppDatabase db, $PaymentSchedulesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PaymentSchedulesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PaymentSchedulesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PaymentSchedulesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> plotId = const Value.absent(),
            Value<String?> stageKey = const Value.absent(),
            Value<String> scheduleName = const Value.absent(),
            Value<double> percentage = const Value.absent(),
            Value<DateTime?> dueDate = const Value.absent(),
            Value<double?> amount = const Value.absent(),
            Value<String> status = const Value.absent(),
          }) =>
              PaymentSchedulesCompanion(
            id: id,
            plotId: plotId,
            stageKey: stageKey,
            scheduleName: scheduleName,
            percentage: percentage,
            dueDate: dueDate,
            amount: amount,
            status: status,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int plotId,
            Value<String?> stageKey = const Value.absent(),
            required String scheduleName,
            required double percentage,
            Value<DateTime?> dueDate = const Value.absent(),
            Value<double?> amount = const Value.absent(),
            Value<String> status = const Value.absent(),
          }) =>
              PaymentSchedulesCompanion.insert(
            id: id,
            plotId: plotId,
            stageKey: stageKey,
            scheduleName: scheduleName,
            percentage: percentage,
            dueDate: dueDate,
            amount: amount,
            status: status,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$PaymentSchedulesTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({plotId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (plotId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.plotId,
                    referencedTable:
                        $$PaymentSchedulesTableReferences._plotIdTable(db),
                    referencedColumn:
                        $$PaymentSchedulesTableReferences._plotIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$PaymentSchedulesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PaymentSchedulesTable,
    PaymentSchedule,
    $$PaymentSchedulesTableFilterComposer,
    $$PaymentSchedulesTableOrderingComposer,
    $$PaymentSchedulesTableAnnotationComposer,
    $$PaymentSchedulesTableCreateCompanionBuilder,
    $$PaymentSchedulesTableUpdateCompanionBuilder,
    (PaymentSchedule, $$PaymentSchedulesTableReferences),
    PaymentSchedule,
    PrefetchHooks Function({bool plotId})>;
typedef $$PaymentEntriesTableCreateCompanionBuilder = PaymentEntriesCompanion
    Function({
  Value<int> id,
  required int projectId,
  Value<int?> plotId,
  Value<int?> buyerId,
  Value<int?> tokenId,
  required DateTime date,
  required double amount,
  Value<String?> amountInWords,
  required String paymentType,
  Value<String?> paymentStage,
  Value<String?> holderSignaturePath,
  Value<String?> authorizedSignaturePath,
  Value<String?> note,
  Value<DateTime> createdAt,
});
typedef $$PaymentEntriesTableUpdateCompanionBuilder = PaymentEntriesCompanion
    Function({
  Value<int> id,
  Value<int> projectId,
  Value<int?> plotId,
  Value<int?> buyerId,
  Value<int?> tokenId,
  Value<DateTime> date,
  Value<double> amount,
  Value<String?> amountInWords,
  Value<String> paymentType,
  Value<String?> paymentStage,
  Value<String?> holderSignaturePath,
  Value<String?> authorizedSignaturePath,
  Value<String?> note,
  Value<DateTime> createdAt,
});

final class $$PaymentEntriesTableReferences
    extends BaseReferences<_$AppDatabase, $PaymentEntriesTable, PaymentEntry> {
  $$PaymentEntriesTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) =>
      db.projects.createAlias(
          $_aliasNameGenerator(db.paymentEntries.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $PlotsTable _plotIdTable(_$AppDatabase db) => db.plots
      .createAlias($_aliasNameGenerator(db.paymentEntries.plotId, db.plots.id));

  $$PlotsTableProcessedTableManager? get plotId {
    if ($_item.plotId == null) return null;
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.id($_item.plotId!));
    final item = $_typedResult.readTableOrNull(_plotIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $BuyersTable _buyerIdTable(_$AppDatabase db) => db.buyers.createAlias(
      $_aliasNameGenerator(db.paymentEntries.buyerId, db.buyers.id));

  $$BuyersTableProcessedTableManager? get buyerId {
    if ($_item.buyerId == null) return null;
    final manager = $$BuyersTableTableManager($_db, $_db.buyers)
        .filter((f) => f.id($_item.buyerId!));
    final item = $_typedResult.readTableOrNull(_buyerIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $TokensTable _tokenIdTable(_$AppDatabase db) => db.tokens.createAlias(
      $_aliasNameGenerator(db.paymentEntries.tokenId, db.tokens.id));

  $$TokensTableProcessedTableManager? get tokenId {
    if ($_item.tokenId == null) return null;
    final manager = $$TokensTableTableManager($_db, $_db.tokens)
        .filter((f) => f.id($_item.tokenId!));
    final item = $_typedResult.readTableOrNull(_tokenIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$PaymentEntriesTableFilterComposer
    extends Composer<_$AppDatabase, $PaymentEntriesTable> {
  $$PaymentEntriesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get amountInWords => $composableBuilder(
      column: $table.amountInWords, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paymentType => $composableBuilder(
      column: $table.paymentType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paymentStage => $composableBuilder(
      column: $table.paymentStage, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get holderSignaturePath => $composableBuilder(
      column: $table.holderSignaturePath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get authorizedSignaturePath => $composableBuilder(
      column: $table.authorizedSignaturePath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableFilterComposer get plotId {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableFilterComposer get buyerId {
    final $$BuyersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableFilterComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableFilterComposer get tokenId {
    final $$TokensTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.tokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableFilterComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentEntriesTableOrderingComposer
    extends Composer<_$AppDatabase, $PaymentEntriesTable> {
  $$PaymentEntriesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get amountInWords => $composableBuilder(
      column: $table.amountInWords,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paymentType => $composableBuilder(
      column: $table.paymentType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paymentStage => $composableBuilder(
      column: $table.paymentStage,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get holderSignaturePath => $composableBuilder(
      column: $table.holderSignaturePath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get authorizedSignaturePath => $composableBuilder(
      column: $table.authorizedSignaturePath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableOrderingComposer get plotId {
    final $$PlotsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableOrderingComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableOrderingComposer get buyerId {
    final $$BuyersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableOrderingComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableOrderingComposer get tokenId {
    final $$TokensTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.tokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableOrderingComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentEntriesTableAnnotationComposer
    extends Composer<_$AppDatabase, $PaymentEntriesTable> {
  $$PaymentEntriesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<DateTime> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get amountInWords => $composableBuilder(
      column: $table.amountInWords, builder: (column) => column);

  GeneratedColumn<String> get paymentType => $composableBuilder(
      column: $table.paymentType, builder: (column) => column);

  GeneratedColumn<String> get paymentStage => $composableBuilder(
      column: $table.paymentStage, builder: (column) => column);

  GeneratedColumn<String> get holderSignaturePath => $composableBuilder(
      column: $table.holderSignaturePath, builder: (column) => column);

  GeneratedColumn<String> get authorizedSignaturePath => $composableBuilder(
      column: $table.authorizedSignaturePath, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableAnnotationComposer get plotId {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$BuyersTableAnnotationComposer get buyerId {
    final $$BuyersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.buyerId,
        referencedTable: $db.buyers,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$BuyersTableAnnotationComposer(
              $db: $db,
              $table: $db.buyers,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$TokensTableAnnotationComposer get tokenId {
    final $$TokensTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.tokenId,
        referencedTable: $db.tokens,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$TokensTableAnnotationComposer(
              $db: $db,
              $table: $db.tokens,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PaymentEntriesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PaymentEntriesTable,
    PaymentEntry,
    $$PaymentEntriesTableFilterComposer,
    $$PaymentEntriesTableOrderingComposer,
    $$PaymentEntriesTableAnnotationComposer,
    $$PaymentEntriesTableCreateCompanionBuilder,
    $$PaymentEntriesTableUpdateCompanionBuilder,
    (PaymentEntry, $$PaymentEntriesTableReferences),
    PaymentEntry,
    PrefetchHooks Function(
        {bool projectId, bool plotId, bool buyerId, bool tokenId})> {
  $$PaymentEntriesTableTableManager(
      _$AppDatabase db, $PaymentEntriesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PaymentEntriesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PaymentEntriesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PaymentEntriesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<int?> plotId = const Value.absent(),
            Value<int?> buyerId = const Value.absent(),
            Value<int?> tokenId = const Value.absent(),
            Value<DateTime> date = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String?> amountInWords = const Value.absent(),
            Value<String> paymentType = const Value.absent(),
            Value<String?> paymentStage = const Value.absent(),
            Value<String?> holderSignaturePath = const Value.absent(),
            Value<String?> authorizedSignaturePath = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
          }) =>
              PaymentEntriesCompanion(
            id: id,
            projectId: projectId,
            plotId: plotId,
            buyerId: buyerId,
            tokenId: tokenId,
            date: date,
            amount: amount,
            amountInWords: amountInWords,
            paymentType: paymentType,
            paymentStage: paymentStage,
            holderSignaturePath: holderSignaturePath,
            authorizedSignaturePath: authorizedSignaturePath,
            note: note,
            createdAt: createdAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            Value<int?> plotId = const Value.absent(),
            Value<int?> buyerId = const Value.absent(),
            Value<int?> tokenId = const Value.absent(),
            required DateTime date,
            required double amount,
            Value<String?> amountInWords = const Value.absent(),
            required String paymentType,
            Value<String?> paymentStage = const Value.absent(),
            Value<String?> holderSignaturePath = const Value.absent(),
            Value<String?> authorizedSignaturePath = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
          }) =>
              PaymentEntriesCompanion.insert(
            id: id,
            projectId: projectId,
            plotId: plotId,
            buyerId: buyerId,
            tokenId: tokenId,
            date: date,
            amount: amount,
            amountInWords: amountInWords,
            paymentType: paymentType,
            paymentStage: paymentStage,
            holderSignaturePath: holderSignaturePath,
            authorizedSignaturePath: authorizedSignaturePath,
            note: note,
            createdAt: createdAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$PaymentEntriesTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: (
              {projectId = false,
              plotId = false,
              buyerId = false,
              tokenId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable:
                        $$PaymentEntriesTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$PaymentEntriesTableReferences._projectIdTable(db).id,
                  ) as T;
                }
                if (plotId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.plotId,
                    referencedTable:
                        $$PaymentEntriesTableReferences._plotIdTable(db),
                    referencedColumn:
                        $$PaymentEntriesTableReferences._plotIdTable(db).id,
                  ) as T;
                }
                if (buyerId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.buyerId,
                    referencedTable:
                        $$PaymentEntriesTableReferences._buyerIdTable(db),
                    referencedColumn:
                        $$PaymentEntriesTableReferences._buyerIdTable(db).id,
                  ) as T;
                }
                if (tokenId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.tokenId,
                    referencedTable:
                        $$PaymentEntriesTableReferences._tokenIdTable(db),
                    referencedColumn:
                        $$PaymentEntriesTableReferences._tokenIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$PaymentEntriesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PaymentEntriesTable,
    PaymentEntry,
    $$PaymentEntriesTableFilterComposer,
    $$PaymentEntriesTableOrderingComposer,
    $$PaymentEntriesTableAnnotationComposer,
    $$PaymentEntriesTableCreateCompanionBuilder,
    $$PaymentEntriesTableUpdateCompanionBuilder,
    (PaymentEntry, $$PaymentEntriesTableReferences),
    PaymentEntry,
    PrefetchHooks Function(
        {bool projectId, bool plotId, bool buyerId, bool tokenId})>;
typedef $$PlotHistoryTableCreateCompanionBuilder = PlotHistoryCompanion
    Function({
  Value<int> id,
  required int projectId,
  required int plotId,
  required String actionType,
  Value<int?> oldBuyerId,
  Value<int?> newBuyerId,
  Value<int?> oldTokenId,
  Value<int?> newTokenId,
  Value<double?> amount,
  Value<String?> note,
  Value<DateTime> createdAt,
});
typedef $$PlotHistoryTableUpdateCompanionBuilder = PlotHistoryCompanion
    Function({
  Value<int> id,
  Value<int> projectId,
  Value<int> plotId,
  Value<String> actionType,
  Value<int?> oldBuyerId,
  Value<int?> newBuyerId,
  Value<int?> oldTokenId,
  Value<int?> newTokenId,
  Value<double?> amount,
  Value<String?> note,
  Value<DateTime> createdAt,
});

final class $$PlotHistoryTableReferences
    extends BaseReferences<_$AppDatabase, $PlotHistoryTable, PlotHistoryData> {
  $$PlotHistoryTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ProjectsTable _projectIdTable(_$AppDatabase db) =>
      db.projects.createAlias(
          $_aliasNameGenerator(db.plotHistory.projectId, db.projects.id));

  $$ProjectsTableProcessedTableManager get projectId {
    final manager = $$ProjectsTableTableManager($_db, $_db.projects)
        .filter((f) => f.id($_item.projectId));
    final item = $_typedResult.readTableOrNull(_projectIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $PlotsTable _plotIdTable(_$AppDatabase db) => db.plots
      .createAlias($_aliasNameGenerator(db.plotHistory.plotId, db.plots.id));

  $$PlotsTableProcessedTableManager get plotId {
    final manager = $$PlotsTableTableManager($_db, $_db.plots)
        .filter((f) => f.id($_item.plotId));
    final item = $_typedResult.readTableOrNull(_plotIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$PlotHistoryTableFilterComposer
    extends Composer<_$AppDatabase, $PlotHistoryTable> {
  $$PlotHistoryTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get actionType => $composableBuilder(
      column: $table.actionType, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get oldBuyerId => $composableBuilder(
      column: $table.oldBuyerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get newBuyerId => $composableBuilder(
      column: $table.newBuyerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get oldTokenId => $composableBuilder(
      column: $table.oldTokenId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get newTokenId => $composableBuilder(
      column: $table.newTokenId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  $$ProjectsTableFilterComposer get projectId {
    final $$ProjectsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableFilterComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableFilterComposer get plotId {
    final $$PlotsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableFilterComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PlotHistoryTableOrderingComposer
    extends Composer<_$AppDatabase, $PlotHistoryTable> {
  $$PlotHistoryTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get actionType => $composableBuilder(
      column: $table.actionType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get oldBuyerId => $composableBuilder(
      column: $table.oldBuyerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get newBuyerId => $composableBuilder(
      column: $table.newBuyerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get oldTokenId => $composableBuilder(
      column: $table.oldTokenId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get newTokenId => $composableBuilder(
      column: $table.newTokenId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  $$ProjectsTableOrderingComposer get projectId {
    final $$ProjectsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableOrderingComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableOrderingComposer get plotId {
    final $$PlotsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableOrderingComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PlotHistoryTableAnnotationComposer
    extends Composer<_$AppDatabase, $PlotHistoryTable> {
  $$PlotHistoryTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get actionType => $composableBuilder(
      column: $table.actionType, builder: (column) => column);

  GeneratedColumn<int> get oldBuyerId => $composableBuilder(
      column: $table.oldBuyerId, builder: (column) => column);

  GeneratedColumn<int> get newBuyerId => $composableBuilder(
      column: $table.newBuyerId, builder: (column) => column);

  GeneratedColumn<int> get oldTokenId => $composableBuilder(
      column: $table.oldTokenId, builder: (column) => column);

  GeneratedColumn<int> get newTokenId => $composableBuilder(
      column: $table.newTokenId, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  $$ProjectsTableAnnotationComposer get projectId {
    final $$ProjectsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.projectId,
        referencedTable: $db.projects,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$ProjectsTableAnnotationComposer(
              $db: $db,
              $table: $db.projects,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$PlotsTableAnnotationComposer get plotId {
    final $$PlotsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.plotId,
        referencedTable: $db.plots,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$PlotsTableAnnotationComposer(
              $db: $db,
              $table: $db.plots,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$PlotHistoryTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PlotHistoryTable,
    PlotHistoryData,
    $$PlotHistoryTableFilterComposer,
    $$PlotHistoryTableOrderingComposer,
    $$PlotHistoryTableAnnotationComposer,
    $$PlotHistoryTableCreateCompanionBuilder,
    $$PlotHistoryTableUpdateCompanionBuilder,
    (PlotHistoryData, $$PlotHistoryTableReferences),
    PlotHistoryData,
    PrefetchHooks Function({bool projectId, bool plotId})> {
  $$PlotHistoryTableTableManager(_$AppDatabase db, $PlotHistoryTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PlotHistoryTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PlotHistoryTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PlotHistoryTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int> projectId = const Value.absent(),
            Value<int> plotId = const Value.absent(),
            Value<String> actionType = const Value.absent(),
            Value<int?> oldBuyerId = const Value.absent(),
            Value<int?> newBuyerId = const Value.absent(),
            Value<int?> oldTokenId = const Value.absent(),
            Value<int?> newTokenId = const Value.absent(),
            Value<double?> amount = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
          }) =>
              PlotHistoryCompanion(
            id: id,
            projectId: projectId,
            plotId: plotId,
            actionType: actionType,
            oldBuyerId: oldBuyerId,
            newBuyerId: newBuyerId,
            oldTokenId: oldTokenId,
            newTokenId: newTokenId,
            amount: amount,
            note: note,
            createdAt: createdAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required int projectId,
            required int plotId,
            required String actionType,
            Value<int?> oldBuyerId = const Value.absent(),
            Value<int?> newBuyerId = const Value.absent(),
            Value<int?> oldTokenId = const Value.absent(),
            Value<int?> newTokenId = const Value.absent(),
            Value<double?> amount = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
          }) =>
              PlotHistoryCompanion.insert(
            id: id,
            projectId: projectId,
            plotId: plotId,
            actionType: actionType,
            oldBuyerId: oldBuyerId,
            newBuyerId: newBuyerId,
            oldTokenId: oldTokenId,
            newTokenId: newTokenId,
            amount: amount,
            note: note,
            createdAt: createdAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$PlotHistoryTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({projectId = false, plotId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (projectId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.projectId,
                    referencedTable:
                        $$PlotHistoryTableReferences._projectIdTable(db),
                    referencedColumn:
                        $$PlotHistoryTableReferences._projectIdTable(db).id,
                  ) as T;
                }
                if (plotId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.plotId,
                    referencedTable:
                        $$PlotHistoryTableReferences._plotIdTable(db),
                    referencedColumn:
                        $$PlotHistoryTableReferences._plotIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$PlotHistoryTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PlotHistoryTable,
    PlotHistoryData,
    $$PlotHistoryTableFilterComposer,
    $$PlotHistoryTableOrderingComposer,
    $$PlotHistoryTableAnnotationComposer,
    $$PlotHistoryTableCreateCompanionBuilder,
    $$PlotHistoryTableUpdateCompanionBuilder,
    (PlotHistoryData, $$PlotHistoryTableReferences),
    PlotHistoryData,
    PrefetchHooks Function({bool projectId, bool plotId})>;
typedef $$AppSettingsTableCreateCompanionBuilder = AppSettingsCompanion
    Function({
  Value<int> id,
  required String key,
  required String value,
});
typedef $$AppSettingsTableUpdateCompanionBuilder = AppSettingsCompanion
    Function({
  Value<int> id,
  Value<String> key,
  Value<String> value,
});

class $$AppSettingsTableFilterComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnFilters(column));
}

class $$AppSettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnOrderings(column));
}

class $$AppSettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $AppSettingsTable> {
  $$AppSettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$AppSettingsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $AppSettingsTable,
    AppSetting,
    $$AppSettingsTableFilterComposer,
    $$AppSettingsTableOrderingComposer,
    $$AppSettingsTableAnnotationComposer,
    $$AppSettingsTableCreateCompanionBuilder,
    $$AppSettingsTableUpdateCompanionBuilder,
    (AppSetting, BaseReferences<_$AppDatabase, $AppSettingsTable, AppSetting>),
    AppSetting,
    PrefetchHooks Function()> {
  $$AppSettingsTableTableManager(_$AppDatabase db, $AppSettingsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AppSettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AppSettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AppSettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> key = const Value.absent(),
            Value<String> value = const Value.absent(),
          }) =>
              AppSettingsCompanion(
            id: id,
            key: key,
            value: value,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String key,
            required String value,
          }) =>
              AppSettingsCompanion.insert(
            id: id,
            key: key,
            value: value,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$AppSettingsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $AppSettingsTable,
    AppSetting,
    $$AppSettingsTableFilterComposer,
    $$AppSettingsTableOrderingComposer,
    $$AppSettingsTableAnnotationComposer,
    $$AppSettingsTableCreateCompanionBuilder,
    $$AppSettingsTableUpdateCompanionBuilder,
    (AppSetting, BaseReferences<_$AppDatabase, $AppSettingsTable, AppSetting>),
    AppSetting,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$ProjectsTableTableManager get projects =>
      $$ProjectsTableTableManager(_db, _db.projects);
  $$BuyersTableTableManager get buyers =>
      $$BuyersTableTableManager(_db, _db.buyers);
  $$TokensTableTableManager get tokens =>
      $$TokensTableTableManager(_db, _db.tokens);
  $$PlotsTableTableManager get plots =>
      $$PlotsTableTableManager(_db, _db.plots);
  $$EoiFormsTableTableManager get eoiForms =>
      $$EoiFormsTableTableManager(_db, _db.eoiForms);
  $$PaymentSchedulesTableTableManager get paymentSchedules =>
      $$PaymentSchedulesTableTableManager(_db, _db.paymentSchedules);
  $$PaymentEntriesTableTableManager get paymentEntries =>
      $$PaymentEntriesTableTableManager(_db, _db.paymentEntries);
  $$PlotHistoryTableTableManager get plotHistory =>
      $$PlotHistoryTableTableManager(_db, _db.plotHistory);
  $$AppSettingsTableTableManager get appSettings =>
      $$AppSettingsTableTableManager(_db, _db.appSettings);
}
