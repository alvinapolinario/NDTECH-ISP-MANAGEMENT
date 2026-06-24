import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/api_contract.dart';
import '../models/payment_receipt.dart';
import '../models/work_item.dart';
import '../providers/collector_app_state.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../utils/receipt_factory.dart';
import '../widgets/common_widgets.dart';
import '../widgets/receipt_preview_card.dart';
import '../widgets/template_widgets.dart';
import 'printer_settings_screen.dart';

const _primaryPaymentMethods = [
  _PaymentMethodChoice(
    ApiContract.paymentMethodCash,
    'Cash',
    'Customer pays in cash',
    Icons.account_balance_wallet_outlined,
  ),
  _PaymentMethodChoice(
    ApiContract.paymentMethodBankTransfer,
    'Bank Transfer',
    'Customer paid via bank',
    Icons.credit_card_outlined,
  ),
  _PaymentMethodChoice(
    ApiContract.paymentMethodGcash,
    'GCash',
    'Customer paid via GCash',
    Icons.qr_code_2_outlined,
  ),
];

class _PaymentMethodChoice {
  const _PaymentMethodChoice(this.value, this.label, this.description, this.icon);

  final String value;
  final String label;
  final String description;
  final IconData icon;
}

class CollectPaymentScreen extends StatefulWidget {
  const CollectPaymentScreen({super.key, required this.item});

  final WorkItem item;

  @override
  State<CollectPaymentScreen> createState() => _CollectPaymentScreenState();
}

class _CollectPaymentScreenState extends State<CollectPaymentScreen> {
  late final TextEditingController _amountController;
  final _referenceController = TextEditingController();
  final _gcashReceiverController = TextEditingController();
  final _paymentNotesController = TextEditingController();
  PaymentReceipt? _receipt;
  bool _saving = false;
  bool _printing = false;
  bool _showMoreMethods = false;
  String _paymentMethod = ApiContract.paymentMethodCash;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(
      text: widget.item.balance.toStringAsFixed(0),
    );
    _amountController.addListener(() => setState(() {}));
    PrinterService.instance.init();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _gcashReceiverController.dispose();
    _paymentNotesController.dispose();
    super.dispose();
  }

  void _setPaymentMethod(String value) {
    if (_paymentMethod == value) return;
    setState(() {
      _paymentMethod = value;
      _referenceController.clear();
      _gcashReceiverController.clear();
      _paymentNotesController.clear();
    });
  }

  String? _validatePaymentDetails() {
    if (ApiContract.requiresGcashDetails(_paymentMethod)) {
      final reference = _referenceController.text.trim();
      final receiver = _gcashReceiverController.text.trim();
      if (reference.isEmpty) {
        return 'Enter the GCash reference number';
      }
      if (receiver.isEmpty) {
        return 'Enter the GCash number of the receiver';
      }
      return null;
    }

    if (ApiContract.requiresPaymentNotes(_paymentMethod)) {
      if (_paymentNotesController.text.trim().isEmpty) {
        return 'Enter payment details for ${ApiContract.paymentMethodLabel(_paymentMethod)}';
      }
    }

    return null;
  }

  ({String? referenceNumber, String? notes}) _buildPaymentDetailsPayload() {
    if (ApiContract.requiresGcashDetails(_paymentMethod)) {
      return (
        referenceNumber: _referenceController.text.trim(),
        notes: 'GCash receiver: ${_gcashReceiverController.text.trim()}',
      );
    }

    if (ApiContract.requiresPaymentNotes(_paymentMethod)) {
      return (
        referenceNumber: null,
        notes: _paymentNotesController.text.trim(),
      );
    }

    return (referenceNumber: null, notes: null);
  }

  String get _invoiceIssueDate {
    final invoice = widget.item.payload['invoice'];
    if (invoice is Map) {
      return formatDate(invoice['issueDate']?.toString());
    }
    return '—';
  }

  String get _addressLine {
    final address = widget.item.payload['installationAddress'];
    if (address is! Map) return widget.item.barangay;
    final street = address['street']?.toString() ?? '';
    final barangay = address['barangay']?.toString() ?? widget.item.barangay;
    if (street.isEmpty) return barangay;
    return '$street, $barangay';
  }

  ({String label, String tone}) get _status {
    if (widget.item.isOverdue) return (label: 'OVERDUE', tone: 'danger');
    if (widget.item.collectionCaseStatus == 'promised_to_pay') {
      return (label: 'PROMISED', tone: 'warning');
    }
    return (label: titleCase(widget.item.status).toUpperCase(), tone: 'default');
  }

  PaymentReceipt _buildPreviewReceipt(CollectorAppState state) {
    final amount = double.tryParse(_amountController.text.trim()) ?? widget.item.balance;
    return buildPaymentReceipt(
      item: widget.item,
      receiptNumber: state.sync.previewReceiptNumber(),
      collectorName: state.user?.name ?? 'Collector',
      previousBalance: widget.item.balance,
      amountPaid: amount,
      paidAt: DateTime.now(),
      paymentMethod: ApiContract.paymentMethodLabel(_paymentMethod),
    );
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid amount')),
      );
      return;
    }

    if (amount > widget.item.balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Amount cannot exceed ${formatMoney(widget.item.balance)}')),
      );
      return;
    }

    final detailsError = _validatePaymentDetails();
    if (detailsError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detailsError)),
      );
      return;
    }

    final paymentDetails = _buildPaymentDetailsPayload();

    setState(() => _saving = true);
    final state = context.read<CollectorAppState>();
    final previousBalance = widget.item.balance;
    final paidAt = DateTime.now();

    try {
      final receiptNumber = await state.sync.recordPayment(
        item: widget.item,
        amount: amount,
        paymentMethod: _paymentMethod,
        referenceNumber: paymentDetails.referenceNumber,
        notes: paymentDetails.notes,
      );
      await state.refreshLocalData();

      final receipt = buildPaymentReceipt(
        item: widget.item,
        receiptNumber: receiptNumber,
        collectorName: state.user?.name ?? 'Collector',
        previousBalance: previousBalance,
        amountPaid: amount,
        paidAt: paidAt,
        paymentMethod: ApiContract.paymentMethodLabel(_paymentMethod),
      );

      if (!mounted) return;
      setState(() {
        _receipt = receipt;
        _saving = false;
      });

      await _printReceipt(showSuccessSnackBar: true);
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(caught.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.red,
        ),
      );
      setState(() => _saving = false);
    }
  }

  Future<void> _printReceipt({bool showSuccessSnackBar = false}) async {
    final receipt = _receipt;
    if (receipt == null) return;

    setState(() => _printing = true);
    try {
      await PrinterService.instance.printReceipt(receipt);
      if (!mounted) return;
      if (showSuccessSnackBar) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Receipt sent to PT210'),
            backgroundColor: AppColors.emerald,
          ),
        );
      }
    } catch (caught) {
      if (!mounted) return;
      final message = caught.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppColors.red,
          action: message.contains('No PT210')
              ? SnackBarAction(
                  label: 'Setup',
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PrinterSettingsScreen()),
                  ),
                )
              : null,
        ),
      );
    } finally {
      if (mounted) setState(() => _printing = false);
    }
  }

  void _done() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  String _paymentNotesHint(String method) {
    switch (method) {
      case ApiContract.paymentMethodBankTransfer:
        return 'Fund transfer to Metrobank of the owner. Ref #: xxxx-xxx-xx';
      case ApiContract.paymentMethodCheck:
        return 'Check no. 123456, BPI, payable to owner';
      case ApiContract.paymentMethodCard:
        return 'Card payment terminal ref / approval code';
      default:
        return 'Enter payment details';
    }
  }

  String _paymentNotesHelper(String method) {
    switch (method) {
      case ApiContract.paymentMethodBankTransfer:
        return 'Include bank name, account owner, and transfer reference.';
      case ApiContract.paymentMethodCheck:
        return 'Include check number, bank, and payee details.';
      case ApiContract.paymentMethodCard:
        return 'Include terminal or approval reference if available.';
      default:
        return 'Describe how the customer paid.';
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<CollectorAppState>();
    final showingReceipt = _receipt != null;
    final status = _status;
    final previewReceipt = showingReceipt ? _receipt! : _buildPreviewReceipt(state);

    return Scaffold(
      appBar: AppBar(
        title: Text(showingReceipt ? 'Payment Recorded' : 'Collect Payment'),
        leading: showingReceipt
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
        automaticallyImplyLeading: !showingReceipt,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!showingReceipt) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CustomerAvatar(name: widget.item.customerName),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.item.customerName,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Account No. ${widget.item.accountNumber}',
                                style: const TextStyle(
                                  color: AppColors.violet,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(label: status.label, tone: status.tone),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_outlined, size: 16, color: AppColors.slate500),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _addressLine,
                            style: const TextStyle(color: AppColors.slate500, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionLabel('BILLING DETAILS'),
                    const SizedBox(height: 12),
                    _BillingRow(
                      'Invoice No.',
                      widget.item.invoiceNumber,
                      valueColor: AppColors.violet,
                    ),
                    _BillingRow('Invoice Date', _invoiceIssueDate),
                    const SizedBox(height: 12),
                    const Text(
                      'Total Balance',
                      style: TextStyle(color: AppColors.slate500, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatMoney(widget.item.balance),
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: AppColors.red,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            TemplateTextField(
              controller: _amountController,
              label: 'Amount to Collect',
              hint: widget.item.balance.toStringAsFixed(0),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 6),
            Text(
              'Outstanding balance: ${formatMoney(widget.item.balance)}',
              style: const TextStyle(color: AppColors.slate500, fontSize: 12),
            ),
            const SizedBox(height: 20),
            const SectionLabel('PAYMENT METHOD'),
            const SizedBox(height: 10),
            ..._primaryPaymentMethods.map(
              (method) => _PaymentMethodTile(
                method: method,
                groupValue: _paymentMethod,
                enabled: !_saving,
                onTap: () => _setPaymentMethod(method.value),
              ),
            ),
            TextButton(
              onPressed: _saving ? null : () => setState(() => _showMoreMethods = !_showMoreMethods),
              child: Text(_showMoreMethods ? 'Hide other methods' : 'Other payment methods'),
            ),
            if (_showMoreMethods)
              ...ApiContract.paymentMethodOptions
                  .where(
                    (option) => !_primaryPaymentMethods.any((m) => m.value == option.value),
                  )
                  .map(
                    (option) => _PaymentMethodTile(
                      method: _PaymentMethodChoice(
                        option.value,
                        option.label,
                        ApiContract.paymentMethodLabel(option.value),
                        Icons.payments_outlined,
                      ),
                      groupValue: _paymentMethod,
                      enabled: !_saving,
                      onTap: () => _setPaymentMethod(option.value),
                    ),
                  ),
            if (ApiContract.requiresGcashDetails(_paymentMethod)) ...[
              const SizedBox(height: 16),
              const SectionLabel('GCASH DETAILS'),
              const SizedBox(height: 10),
              TemplateTextField(
                controller: _referenceController,
                label: 'GCash reference number',
                hint: 'e.g. 123456789012',
                icon: Icons.tag_outlined,
              ),
              const SizedBox(height: 14),
              TemplateTextField(
                controller: _gcashReceiverController,
                label: 'GCash number of receiver',
                hint: 'e.g. 09171234567',
                icon: Icons.phone_android_outlined,
                keyboardType: TextInputType.phone,
              ),
            ] else if (ApiContract.requiresPaymentNotes(_paymentMethod)) ...[
              const SizedBox(height: 16),
              const SectionLabel('PAYMENT DETAILS'),
              const SizedBox(height: 10),
              TemplateTextField(
                controller: _paymentNotesController,
                label: 'Notes',
                hint: _paymentNotesHint(_paymentMethod),
                icon: Icons.notes_outlined,
                maxLines: 4,
              ),
              const SizedBox(height: 6),
              Text(
                _paymentNotesHelper(_paymentMethod),
                style: const TextStyle(color: AppColors.slate500, fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            GreenActionButton(
              label: 'Record Payment',
              icon: Icons.receipt_long_outlined,
              loading: _saving,
              onPressed: _submit,
            ),
            const SizedBox(height: 20),
            _PendingReceiptPreview(receipt: previewReceipt),
          ] else ...[
            ReceiptPreviewCard(receipt: _receipt!),
            if (_printing) ...[
              const SizedBox(height: 12),
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Printing receipt…',
                    style: TextStyle(color: AppColors.slate500),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 20),
            GreenActionButton(
              label: 'Reprint',
              icon: Icons.print_outlined,
              loading: _printing,
              onPressed: _printReceipt,
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _printing ? null : _done,
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Done'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.violetDark,
                side: const BorderSide(color: AppColors.violet),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BillingRow extends StatelessWidget {
  const _BillingRow(this.label, this.value, {this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.slate500, fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: valueColor ?? AppColors.slate900,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  const _PaymentMethodTile({
    required this.method,
    required this.groupValue,
    required this.onTap,
    this.enabled = true,
  });

  final _PaymentMethodChoice method;
  final String groupValue;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final selected = groupValue == method.value;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected ? AppColors.violetLight : Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? AppColors.violet : AppColors.slate200,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: selected ? Colors.white : AppColors.violetLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(method.icon, color: AppColors.violetDark, size: 20),
                ),
                const SizedBox(width: 10),
                Radio<String>(
                  value: method.value,
                  groupValue: groupValue,
                  onChanged: enabled ? (_) => onTap() : null,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        method.label,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      Text(
                        method.description,
                        style: const TextStyle(color: AppColors.slate500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PendingReceiptPreview extends StatelessWidget {
  const _PendingReceiptPreview({required this.receipt});

  final PaymentReceipt receipt;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.emeraldLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.emerald.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Receipt Preview',
                style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate700),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Ready to Record',
                  style: TextStyle(
                    color: AppColors.emerald,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _PreviewRow('Receipt No.', receipt.receiptNumber),
          _PreviewRow('Date & Time', formatDateTime(receipt.paidAt)),
          _PreviewRow('Collector', receipt.collectorName),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 14, color: AppColors.slate500),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Receipt will be saved after recording the payment.',
                  style: TextStyle(color: AppColors.slate500, fontSize: 12),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PreviewRow extends StatelessWidget {
  const _PreviewRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: AppColors.slate500, fontSize: 12)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
