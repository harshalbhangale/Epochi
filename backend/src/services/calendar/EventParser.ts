import { calendar_v3 } from 'googleapis';

/**
 * Parsed transaction intent from calendar event
 */
export interface ParsedTransaction {
  valid: boolean;
  type: 'swap' | 'transfer' | 'unknown';
  fromToken: string;
  toToken: string;
  amount: string;
  executionTime: Date;
  eventId: string;
  eventTitle: string;
  error?: string;
}

/**
 * EventParser extracts transaction intents from calendar event titles
 */
export class EventParser {
  /**
   * Parse a calendar event for transaction intent
   */
  static parseEvent(event: calendar_v3.Schema$Event): ParsedTransaction {
    const eventId = event.id || '';
    const eventTitle = event.summary || '';
    const startTime = event.start?.dateTime || event.start?.date;

    if (!startTime) {
      return {
        valid: false,
        type: 'unknown',
        fromToken: '',
        toToken: '',
        amount: '',
        executionTime: new Date(),
        eventId,
        eventTitle,
        error: 'No start time found'
      };
    }

    const executionTime = new Date(startTime);

    // Check if title contains swap pattern
    if (this.isSwapPattern(eventTitle)) {
      return this.parseSwapEvent(eventTitle, executionTime, eventId);
    }

    // Check if title contains transfer pattern
    if (this.isTransferPattern(eventTitle)) {
      return this.parseTransferEvent(eventTitle, executionTime, eventId);
    }

    return {
      valid: false,
      type: 'unknown',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle,
      error: 'No recognized transaction pattern'
    };
  }

  /**
   * Check if event title matches swap pattern
   * Patterns: "Swap 0.1 ETH to USDC", "swap 1 ETH for USDC", "0.1 ETH -> USDC"
   */
  private static isSwapPattern(title: string): boolean {
    const patterns = [
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(to|for|->)\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+->\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
    ];

    return patterns.some(pattern => pattern.test(title));
  }

  /**
   * Check if event title matches transfer pattern
   * Patterns: "Send 0.1 ETH to 0x123...", "Transfer 100 USDC to 0xabc..."
   */
  private static isTransferPattern(title: string): boolean {
    const pattern = /(send|transfer)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
    return pattern.test(title);
  }

  /**
   * Parse swap event details
   */
  private static parseSwapEvent(
    title: string,
    executionTime: Date,
    eventId: string
  ): ParsedTransaction {
    // Try different swap patterns
    const patterns = [
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(to|for|->)\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+->\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const amount = match[1];
        const fromToken = match[2].toUpperCase();
        const toToken = match[match.length - 1].toUpperCase();

        return {
          valid: true,
          type: 'swap',
          fromToken,
          toToken,
          amount,
          executionTime,
          eventId,
          eventTitle: title
        };
      }
    }

    return {
      valid: false,
      type: 'swap',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle: title,
      error: 'Failed to parse swap details'
    };
  }

  /**
   * Parse transfer event details
   */
  private static parseTransferEvent(
    title: string,
    executionTime: Date,
    eventId: string
  ): ParsedTransaction {
    const pattern = /(send|transfer)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
    const match = title.match(pattern);

    if (match) {
      const amount = match[2];
      const token = match[3].toUpperCase();
      const toAddress = match[4];

      return {
        valid: true,
        type: 'transfer',
        fromToken: token,
        toToken: toAddress, // For transfers, toToken stores recipient address
        amount,
        executionTime,
        eventId,
        eventTitle: title
      };
    }

    return {
      valid: false,
      type: 'transfer',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle: title,
      error: 'Failed to parse transfer details'
    };
  }

  /**
   * Validate parsed transaction
   */
  static validateTransaction(parsed: ParsedTransaction): boolean {
    if (!parsed.valid) return false;
    
    // Check amount is positive
    const amount = parseFloat(parsed.amount);
    if (isNaN(amount) || amount <= 0) {
      return false;
    }

    // Check tokens are specified
    if (!parsed.fromToken || !parsed.toToken) {
      return false;
    }

    // Check execution time is in future (with 1 minute buffer)
    const now = new Date();
    const buffer = 60 * 1000; // 1 minute
    if (parsed.executionTime.getTime() < now.getTime() - buffer) {
      return false;
    }

    return true;
  }

  /**
   * Format transaction for display
   */
  static formatTransaction(parsed: ParsedTransaction): string {
    if (parsed.type === 'swap') {
      return `Swap ${parsed.amount} ${parsed.fromToken} → ${parsed.toToken}`;
    } else if (parsed.type === 'transfer') {
      return `Transfer ${parsed.amount} ${parsed.fromToken} to ${parsed.toToken}`;
    }
    return 'Unknown transaction';
  }
}

export default EventParser;

