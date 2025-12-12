# Performance Optimization

Analyze and optimize code for performance, efficiency, and scalability:

## Performance Analysis
1. **Algorithm Complexity**
   - Identify O(n²) or worse time complexity
   - Suggest more efficient algorithms
   - Review recursive vs iterative approaches
   - Optimize sorting and searching operations

2. **Memory Usage**
   - Identify memory leaks
   - Check for unnecessary object creation
   - Review data structure choices
   - Optimize large data handling

3. **Database Optimization**
   - Review query efficiency (N+1 queries)
   - Check for missing indexes
   - Optimize JOIN operations
   - Review connection pooling

4. **Network & I/O**
   - Identify blocking operations
   - Review async/await usage
   - Check for unnecessary API calls
   - Optimize file I/O operations

5. **Rendering Performance** (Frontend)
   - Review re-render triggers
   - Check for unnecessary component updates
   - Optimize list rendering (virtualization)
   - Review bundle size and code splitting

## Optimization Strategies
- Caching (memoization, HTTP caching, database caching)
- Lazy loading and code splitting
- Debouncing and throttling
- Batch operations
- Parallel processing where applicable
- Resource pooling (connections, threads)

## Output Format
For each optimization opportunity:
1. **Location**: File and line number
2. **Current Issue**: What's inefficient
3. **Impact**: Performance cost (time/memory)
4. **Optimization**: Specific improvement
5. **Expected Gain**: Estimated performance improvement
6. **Trade-offs**: Any complexity or maintainability costs

Prioritize optimizations by potential impact vs implementation effort.
