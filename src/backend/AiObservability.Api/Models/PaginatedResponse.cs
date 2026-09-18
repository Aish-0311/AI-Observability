namespace AiObservability.Api.Models;

public record PaginatedResponse<T>(
    List<T> Data,
    int PageNumber,
    int PageSize,
    int TotalCount,
    int TotalPages
)
{
    public static PaginatedResponse<T> Create(List<T> items, int pageNumber, int pageSize)
    {
        var totalCount = items.Count;
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        
        var paginatedItems = items
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PaginatedResponse<T>(
            Data: paginatedItems,
            PageNumber: pageNumber,
            PageSize: pageSize,
            TotalCount: totalCount,
            TotalPages: totalPages
        );
    }
}
