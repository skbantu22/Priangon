export default function OrderSummary({ summary }) {
  return (
    <div className="space-y-5">
      {/* Top Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow">
          <h4>Total Orders</h4>
          <h2 className="text-3xl font-bold">{summary.totalOrders}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h4>Total Sales</h4>
          <h2 className="text-3xl font-bold">৳ {summary.totalSales}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h4>Today's Sales</h4>
          <h2 className="text-3xl font-bold">৳ {summary.todaySales}</h2>
        </div>
      </div>

      {/* Showroom Sales */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold mb-4">Showroom Performance</h3>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Showroom</th>
              <th>Orders</th>
              <th>Sales</th>
            </tr>
          </thead>

          <tbody>
            {summary.showroomSales?.map((item) => (
              <tr key={item.showroomId} className="border-b">
                <td className="py-3">{item.showroomName}</td>

                <td className="text-center">{item.totalOrders}</td>

                <td className="text-center font-semibold">
                  ৳ {item.totalSales}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
