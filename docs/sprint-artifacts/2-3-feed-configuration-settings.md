# Story 2.3: Feed Configuration Settings

**Epic:** Epic 2 - RSS Feed Management
**Story Status:** drafted
**Estimated Effort:** Medium (4-6 hours)

## User Story

As a user,
I want to configure feed update frequencies and filters,
So that I can control how and when feeds are processed.

## Acceptance Criteria

**Given** user has RSS feeds configured
**When** user edits feed settings
**Then** update frequency can be set (hourly, daily, manual)
**And** keyword filters can be applied
**And** content type filters work
**And** settings are saved and applied

## Prerequisites

- Story 2.2: Feed Organization and Management (completed)

## Technical Requirements

### Database Schema Updates
- Add configuration fields to Feed model:
  - `updateFrequency`: enum ('manual', 'hourly', 'daily', 'weekly')
  - `keywordFilters`: JSON array of strings
  - `contentFilters`: JSON object with filter rules
  - `lastConfigUpdate`: DateTime

### UI Components Needed
- `FeedSettingsModal` or inline settings panel
- Frequency selector dropdown
- Keyword filter input with add/remove
- Content type filter checkboxes
- Save/Cancel actions

### Service Layer Updates
- Update `contentService.updateFeed()` to handle new config fields
- Add validation for filter formats
- Implement filter application logic

## Implementation Plan

### Phase 1: Database Schema
1. Update Prisma schema with new Feed fields
2. Generate and run migration
3. Update TypeScript interfaces

### Phase 2: UI Components
1. Create FeedSettings component
2. Add frequency selection dropdown
3. Implement keyword filter management
4. Add content type filters

### Phase 3: Service Integration
1. Update contentService methods
2. Add validation logic
3. Implement filter processing

### Phase 4: Settings Application
1. Apply frequency settings to fetch scheduling
2. Implement keyword filtering in RSS parsing
3. Apply content type filters

## Testing Strategy

### Unit Tests
- Feed settings validation
- Filter application logic
- Service method updates

### Integration Tests
- Settings persistence
- Filter application in RSS processing
- UI component interactions

### E2E Tests
- Complete settings workflow
- Filter effectiveness validation

## Definition of Done

- [ ] Feed update frequency can be configured (manual/hourly/daily/weekly)
- [ ] Keyword filters can be added and removed
- [ ] Content type filters work (text, images, etc.)
- [ ] Settings are saved to database
- [ ] Settings are applied during RSS processing
- [ ] UI provides clear feedback for all operations
- [ ] Error handling for invalid configurations
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Documentation updated

## Notes

- Frequency settings should integrate with future scheduling system (Story 2.4)
- Filters should be applied during RSS parsing (Story 2.4)
- Consider performance impact of complex filters
- Settings should be easily accessible from feed list