BEGIN TRY

BEGIN TRAN;

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

CREATE TABLE [dbo].[User] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [bankId] NVARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(150) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'PENDING',
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_bankId_key] UNIQUE NONCLUSTERED ([bankId])
);

CREATE TABLE [dbo].[TrainingType] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [TrainingType_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [TrainingType_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TrainingType_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TrainingType_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TrainingType_name_key] UNIQUE NONCLUSTERED ([name])
);

CREATE TABLE [dbo].[Institution] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Institution_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Institution_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Institution_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Institution_name_key] UNIQUE NONCLUSTERED ([name])
);

CREATE TABLE [dbo].[ParticipationRole] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ParticipationRole_active_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [ParticipationRole_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ParticipationRole_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ParticipationRole_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ParticipationRole_name_key] UNIQUE NONCLUSTERED ([name])
);

CREATE TABLE [dbo].[CompletionStatus] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [CompletionStatus_active_df] DEFAULT 1,
    [isFinal] BIT NOT NULL CONSTRAINT [CompletionStatus_isFinal_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [CompletionStatus_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CompletionStatus_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CompletionStatus_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompletionStatus_name_key] UNIQUE NONCLUSTERED ([name])
);

CREATE TABLE [dbo].[TrainingProgram] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(300) NOT NULL,
    [locationScope] NVARCHAR(20) NOT NULL,
    [trainingTypeId] UNIQUEIDENTIFIER NOT NULL,
    [institutionId] UNIQUEIDENTIFIER NOT NULL,
    [venue] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(max),
    [active] BIT NOT NULL CONSTRAINT [TrainingProgram_active_df] DEFAULT 1,
    [createdById] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TrainingProgram_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TrainingProgram_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[TrainingParticipation] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [trainingProgramId] UNIQUEIDENTIFIER NOT NULL,
    [deliveryMode] NVARCHAR(20) NOT NULL,
    [participationRoleId] UNIQUEIDENTIFIER NOT NULL,
    [fromDate] DATE NOT NULL,
    [toDate] DATE NOT NULL,
    [completionStatusId] UNIQUEIDENTIFIER NOT NULL,
    [remarks] NVARCHAR(2000),
    [workflowStatus] NVARCHAR(20) NOT NULL CONSTRAINT [TrainingParticipation_workflowStatus_df] DEFAULT 'DRAFT',
    [adminComment] NVARCHAR(2000),
    [submittedAt] DATETIME2,
    [approvedAt] DATETIME2,
    [approvedById] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TrainingParticipation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TrainingParticipation_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[AuditLog] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [actorUserId] UNIQUEIDENTIFIER,
    [action] NVARCHAR(100) NOT NULL,
    [entityType] NVARCHAR(80) NOT NULL,
    [entityId] NVARCHAR(80) NOT NULL,
    [beforeJson] NVARCHAR(max),
    [afterJson] NVARCHAR(max),
    [ipAddress] NVARCHAR(80),
    [userAgent] NVARCHAR(400),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[AppSetting] (
    [id] NVARCHAR(20) NOT NULL CONSTRAINT [AppSetting_id_df] DEFAULT 'default',
    [allowHybridDelivery] BIT NOT NULL CONSTRAINT [AppSetting_allowHybridDelivery_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AppSetting_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [User_fullName_idx] ON [dbo].[User]([fullName]);
CREATE NONCLUSTERED INDEX [User_status_idx] ON [dbo].[User]([status]);
CREATE NONCLUSTERED INDEX [User_role_idx] ON [dbo].[User]([role]);
CREATE NONCLUSTERED INDEX [TrainingProgram_name_idx] ON [dbo].[TrainingProgram]([name]);
CREATE NONCLUSTERED INDEX [TrainingProgram_active_idx] ON [dbo].[TrainingProgram]([active]);
CREATE NONCLUSTERED INDEX [TrainingProgram_locationScope_idx] ON [dbo].[TrainingProgram]([locationScope]);
CREATE NONCLUSTERED INDEX [TrainingProgram_institutionId_idx] ON [dbo].[TrainingProgram]([institutionId]);
CREATE NONCLUSTERED INDEX [TrainingParticipation_userId_idx] ON [dbo].[TrainingParticipation]([userId]);
CREATE NONCLUSTERED INDEX [TrainingParticipation_trainingProgramId_idx] ON [dbo].[TrainingParticipation]([trainingProgramId]);
CREATE NONCLUSTERED INDEX [TrainingParticipation_workflowStatus_idx] ON [dbo].[TrainingParticipation]([workflowStatus]);
CREATE NONCLUSTERED INDEX [TrainingParticipation_fromDate_toDate_idx] ON [dbo].[TrainingParticipation]([fromDate], [toDate]);
CREATE NONCLUSTERED INDEX [TrainingParticipation_submittedAt_idx] ON [dbo].[TrainingParticipation]([submittedAt]);
CREATE NONCLUSTERED INDEX [AuditLog_action_idx] ON [dbo].[AuditLog]([action]);
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);
CREATE NONCLUSTERED INDEX [AuditLog_actorUserId_idx] ON [dbo].[AuditLog]([actorUserId]);

ALTER TABLE [dbo].[TrainingProgram] ADD CONSTRAINT [TrainingProgram_trainingTypeId_fkey] FOREIGN KEY ([trainingTypeId]) REFERENCES [dbo].[TrainingType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingProgram] ADD CONSTRAINT [TrainingProgram_institutionId_fkey] FOREIGN KEY ([institutionId]) REFERENCES [dbo].[Institution]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingProgram] ADD CONSTRAINT [TrainingProgram_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingParticipation] ADD CONSTRAINT [TrainingParticipation_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingParticipation] ADD CONSTRAINT [TrainingParticipation_trainingProgramId_fkey] FOREIGN KEY ([trainingProgramId]) REFERENCES [dbo].[TrainingProgram]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingParticipation] ADD CONSTRAINT [TrainingParticipation_participationRoleId_fkey] FOREIGN KEY ([participationRoleId]) REFERENCES [dbo].[ParticipationRole]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingParticipation] ADD CONSTRAINT [TrainingParticipation_completionStatusId_fkey] FOREIGN KEY ([completionStatusId]) REFERENCES [dbo].[CompletionStatus]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[TrainingParticipation] ADD CONSTRAINT [TrainingParticipation_approvedById_fkey] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_actorUserId_fkey] FOREIGN KEY ([actorUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
