# Logger System Guide - 02/12/2025 14:30

## Mô tả

Hướng dẫn sử dụng logger system trong application để debug và monitor.

## Files

- **logger.md** - Overview về logger system
- **LOGGER_GUIDE.md** - Chi tiết cách sử dụng logger, patterns và best practices

## Logger Features

- Categorized logging (MediaManager, JitsiManager, Redux, etc.)
- Log levels (debug, info, warn, error)
- Environment-based filtering
- Structured logging format
- Performance monitoring

## Usage

```typescript
import { logger } from '@/services/logger'

logger.media.info('Device changed', { deviceId, kind })
logger.jitsi.error('Track creation failed', error)
```

## Mục đích

- Consistent logging across application
- Easy debugging và troubleshooting
- Production monitoring ready
- Performance tracking
